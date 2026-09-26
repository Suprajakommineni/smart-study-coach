import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import Groq from 'groq-sdk';

@Injectable()
export class QuestionService {
  private groq: Groq;

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  // =========================================================
  // GENERATE 15 QUESTIONS FOR THE WHOLE MODULE
  // =========================================================

  async generateQuestions(moduleId: number, userId: number) {
    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        subject: {
          workspace: {
            userId,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // =======================================================
    // GET ACCEPTED CONCEPTS
    // =======================================================

    const acceptedConcepts = await this.prisma.concept.findMany({
      where: {
        status: 'accepted',
        source: {
          moduleId,
        },
      },
      select: {
        id: true,
        title: true,
        definition: true,
      },
    });

    if (acceptedConcepts.length === 0) {
      throw new BadRequestException(
        'No accepted concepts found for this module. Please accept at least one concept before generating questions.',
      );
    }

    // =======================================================
    // RETIRE OLD AI-GENERATED QUESTIONS
    // =======================================================

    const oldGeneratedQuestions = await this.prisma.question.findMany({
      where: {
        status: 'generated',
        concepts: {
          some: {
            concept: {
              source: {
                moduleId,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    const oldQuestionIds = oldGeneratedQuestions.map(
      (question) => question.id,
    );

    if (oldQuestionIds.length > 0) {
      await this.prisma.question.updateMany({
        where: {
          id: {
            in: oldQuestionIds,
          },
          status: 'generated',
        },
        data: {
          status: 'retired',
        },
      });
    }

    // =======================================================
    // PREPARE CONCEPT INFORMATION FOR AI
    // =======================================================

    const conceptList = acceptedConcepts
      .map(
        (concept) => `
Concept ID: ${concept.id}
Title: ${concept.title}
Definition: ${concept.definition}`,
      )
      .join('\n');

    // =======================================================
    // PROMPT
    // =======================================================

    const prompt = `
Generate exactly 15 quiz questions for the study module below.

ACCEPTED CONCEPTS:

${conceptList}

REQUIREMENTS:

1. Generate exactly 15 questions TOTAL for the entire module.
2. Do NOT generate 15 questions for each concept.
3. Cover the accepted concepts as evenly as reasonably possible.
4. Every question must have a conceptId matching one of the accepted concepts.
5. Generate:
   - 6 multiple choice questions
   - 5 true/false questions
   - 4 short-answer questions
6. Every question must be unique.
7. Questions should test different aspects of the concepts.
8. Difficulty must be an integer from 1 to 5.

MCQ:
- type = "mcq"
- exactly 4 choices
- answer must exactly match one choice

TRUE/FALSE:
- type = "true_false"
- choices = ["True", "False"]
- answer = "True" or "False"

SHORT ANSWER:
- type = "short_answer"
- choices = null
- answer contains the expected answer

Do not create questions about concepts that are not listed above.
`;

    try {
      // =====================================================
      // GROQ STRUCTURED OUTPUT
      // =====================================================

      const completion = await this.groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',

        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],

        temperature: 0.2,

        reasoning_effort: 'low',

        max_completion_tokens: 5000,

        response_format: {
          type: 'json_schema',

          json_schema: {
            name: 'module_questions',

            strict: true,

            schema: {
              type: 'object',

              properties: {
                questions: {
                  type: 'array',

                  items: {
                    type: 'object',

                    properties: {
                      conceptId: {
                        type: 'integer',
                      },

                      type: {
                        type: 'string',
                        enum: [
                          'mcq',
                          'true_false',
                          'short_answer',
                        ],
                      },

                      text: {
                        type: 'string',
                      },

                      answer: {
                        type: 'string',
                      },

                      choices: {
                        type: ['array', 'null'],

                        items: {
                          type: 'string',
                        },
                      },

                      difficulty: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 5,
                      },
                    },

                    required: [
                      'conceptId',
                      'type',
                      'text',
                      'answer',
                      'choices',
                      'difficulty',
                    ],

                    additionalProperties: false,
                  },
                },
              },

              required: ['questions'],

              additionalProperties: false,
            },
          },
        },
      });

      // =====================================================
      // READ AI RESPONSE
      // =====================================================

      const responseText =
        completion.choices[0]?.message?.content ?? '';

      if (!responseText) {
        throw new Error('AI returned an empty response');
      }

      console.log('AI returned structured questions');

      const parsed = JSON.parse(responseText);

      const aiQuestions = parsed.questions;

      if (!Array.isArray(aiQuestions)) {
        throw new Error(
          'AI response does not contain a questions array',
        );
      }

      // =====================================================
      // REQUIRE EXACTLY 15 QUESTIONS
      // =====================================================

      if (aiQuestions.length !== 15) {
        throw new Error(
          `AI returned ${aiQuestions.length} questions instead of exactly 15`,
        );
      }

      // =====================================================
      // VALID CONCEPT IDS
      // =====================================================

      const acceptedConceptIds = new Set(
        acceptedConcepts.map((concept) => concept.id),
      );

      // =====================================================
      // SAVE AI RUN
      // =====================================================

      const aiRun = await this.prisma.aiRun.create({
        data: {
          model: 'openai/gpt-oss-20b',
          promptVersion: 'question-generator-v6',
          input: prompt,
          output: responseText,
        },
      });

      const generatedQuestionIds: number[] = [];

      const seenQuestions = new Set<string>();

      // =====================================================
      // SAVE QUESTIONS
      // =====================================================

      for (const q of aiQuestions) {
        // ---------------------------------------------------
        // VALIDATE CONCEPT
        // ---------------------------------------------------

        const conceptId = Number(q.conceptId);

        if (!acceptedConceptIds.has(conceptId)) {
          continue;
        }

        // ---------------------------------------------------
        // VALIDATE QUESTION TEXT
        // ---------------------------------------------------

        if (!q.text?.trim() || !q.answer?.trim()) {
          continue;
        }

        // ---------------------------------------------------
        // PREVENT DUPLICATES
        // ---------------------------------------------------

        const normalizedText = String(q.text)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');

        if (seenQuestions.has(normalizedText)) {
          continue;
        }

        seenQuestions.add(normalizedText);

        // ---------------------------------------------------
        // VALIDATE CHOICES
        // ---------------------------------------------------

        let choices: string[] | null = null;

        if (q.type === 'mcq') {
          if (
            !Array.isArray(q.choices) ||
            q.choices.length !== 4
          ) {
            continue;
          }

          const mcqChoices = q.choices.map(
            (choice: string) => choice.trim(),
          );

          if (
            !mcqChoices.includes(
              String(q.answer).trim(),
            )
          ) {
            continue;
          }

          choices = mcqChoices;
        }

        // ---------------------------------------------------
        // TRUE / FALSE
        // ---------------------------------------------------

        if (q.type === 'true_false') {
          choices = ['True', 'False'];

          if (
            !['True', 'False'].includes(
              String(q.answer).trim(),
            )
          ) {
            continue;
          }
        }

        // ---------------------------------------------------
        // SHORT ANSWER
        // ---------------------------------------------------

        if (q.type === 'short_answer') {
          choices = null;
        }

        // ---------------------------------------------------
        // CREATE QUESTION
        // ---------------------------------------------------

        const question = await this.prisma.question.create({
          data: {
            type: q.type,
            text: String(q.text).trim(),
            answer: String(q.answer).trim(),
            choices: choices
              ? JSON.stringify(choices)
              : null,
            difficulty: q.difficulty,
            status: 'generated',
            aiRunId: aiRun.id,
          },
        });

        // ---------------------------------------------------
        // LINK QUESTION TO CONCEPT
        // ---------------------------------------------------

        await this.prisma.questionConcept.create({
          data: {
            questionId: question.id,
            conceptId,
          },
        });

        // ---------------------------------------------------
        // CREATE VERSION
        // ---------------------------------------------------

        await this.prisma.questionVersion.create({
          data: {
            questionId: question.id,
            version: 1,
            text: question.text,
            answer: question.answer,
            choices: question.choices,
            difficulty: question.difficulty,
          },
        });

        generatedQuestionIds.push(question.id);
      }

      // =====================================================
      // FINAL VALIDATION
      // =====================================================

      if (generatedQuestionIds.length !== 15) {
        throw new Error(
          `Only ${generatedQuestionIds.length} valid questions were saved. Expected 15.`,
        );
      }

      // =====================================================
      // AUDIT LOG
      // =====================================================

      await this.auditLogService.createLog(
        userId,
        'generate',
        'Question',
        moduleId,
        {
          retiredQuestionIds: oldQuestionIds,
        },
        {
          generatedQuestionIds,
          questionCount: 15,
          conceptIds: acceptedConcepts.map(
            (concept) => concept.id,
          ),
        },
      );

      // =====================================================
      // RETURN QUESTIONS
      // =====================================================

      return this.prisma.question.findMany({
        where: {
          id: {
            in: generatedQuestionIds,
          },
        },

        include: {
          concepts: {
            include: {
              concept: true,
            },
          },

          versions: {
            orderBy: {
              version: 'desc',
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.log(
        `Question generation failed for module ${moduleId}`,
        error,
      );

      if (error instanceof Error) {
        console.log(
          'Generation error:',
          error.message,
        );
      }

      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to generate questions',
      );
    }
  }
  // =========================================================
  // GET QUESTIONS
  // =========================================================

  async findAllForModule(moduleId: number, userId: number) {
    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        subject: {
          workspace: {
            userId,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return this.prisma.question.findMany({
      where: {
        status: {
          not: 'retired',
        },
        concepts: {
          some: {
            concept: {
              status: 'accepted',
              source: {
                moduleId,
              },
            },
          },
        },
      },
      include: {
        concepts: {
          include: {
            concept: true,
          },
        },
        versions: {
          orderBy: {
            version: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // EDIT QUESTION
  // =========================================================

  async editQuestion(
    questionId: number,
    userId: number,
    data: {
      text: string;
      answer: string;
      choices?: string[] | null;
      difficulty: number;
      conceptIds: number[];
    },
  ) {
    if (data.difficulty < 1 || data.difficulty > 5) {
      throw new BadRequestException('Difficulty must be between 1 and 5');
    }

    if (!data.text.trim()) {
      throw new BadRequestException('Question text is required');
    }

    if (!data.answer.trim()) {
      throw new BadRequestException('Expected answer is required');
    }

    const question = await this.prisma.question.findFirst({
      where: {
        id: questionId,
        concepts: {
          some: {
            concept: {
              source: {
                module: {
                  subject: {
                    workspace: {
                      userId,
                    },
                  },
                },
              },
            },
          },
        },
      },
      include: {
        concepts: true,
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.status === 'retired') {
      throw new BadRequestException('Retired questions cannot be edited');
    }

    const beforeData = {
      text: question.text,
      answer: question.answer,
      choices: question.choices,
      difficulty: question.difficulty,
      status: question.status,
      conceptIds: question.concepts.map((item) => item.conceptId),
    };

    const nextVersion = (question.versions[0]?.version ?? 0) + 1;

    const choices =
      data.choices && data.choices.length > 0
        ? JSON.stringify(data.choices)
        : null;

    const updatedQuestion = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: {
          id: questionId,
        },
        data: {
          text: data.text.trim(),
          answer: data.answer.trim(),
          choices,
          difficulty: data.difficulty,
          status: 'user-edited',
        },
      });

      await tx.questionVersion.create({
        data: {
          questionId,
          version: nextVersion,
          text: updated.text,
          answer: updated.answer,
          choices: updated.choices,
          difficulty: updated.difficulty,
        },
      });

      await tx.questionConcept.deleteMany({
        where: {
          questionId,
        },
      });

      if (data.conceptIds.length > 0) {
        await tx.questionConcept.createMany({
          data: data.conceptIds.map((conceptId) => ({
            questionId,
            conceptId,
          })),
        });
      }

      return updated;
    });

    await this.auditLogService.createLog(
      userId,
      'edit',
      'Question',
      questionId,
      beforeData,
      {
        text: updatedQuestion.text,
        answer: updatedQuestion.answer,
        choices: updatedQuestion.choices,
        difficulty: updatedQuestion.difficulty,
        status: updatedQuestion.status,
        conceptIds: data.conceptIds,
        version: nextVersion,
      },
    );

    return updatedQuestion;
  }

  // =========================================================
  // APPROVE QUESTION
  // =========================================================

  async approveQuestion(questionId: number, userId: number) {
    const question = await this.getOwnedQuestion(questionId, userId);

    if (question.status === 'retired') {
      throw new BadRequestException('Retired questions cannot be approved');
    }

    const updated = await this.prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        status: 'approved',
      },
    });

    await this.auditLogService.createLog(
      userId,
      'approve',
      'Question',
      questionId,
      {
        status: question.status,
      },
      {
        status: 'approved',
      },
    );

    return updated;
  }

  // =========================================================
  // RETIRE QUESTION
  // =========================================================

  async retireQuestion(questionId: number, userId: number) {
    const question = await this.getOwnedQuestion(questionId, userId);

    if (question.status === 'retired') {
      throw new BadRequestException('Question is already retired');
    }

    const updated = await this.prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        status: 'retired',
      },
    });

    await this.auditLogService.createLog(
      userId,
      'retire',
      'Question',
      questionId,
      {
        status: question.status,
      },
      {
        status: 'retired',
      },
    );

    return updated;
  }

  // =========================================================
  // OWNERSHIP CHECK
  // =========================================================

  private async getOwnedQuestion(questionId: number, userId: number) {
    const question = await this.prisma.question.findFirst({
      where: {
        id: questionId,
        concepts: {
          some: {
            concept: {
              source: {
                module: {
                  subject: {
                    workspace: {
                      userId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }
}
