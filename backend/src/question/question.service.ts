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
  // GENERATE QUESTIONS
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

    const acceptedConcepts = await this.prisma.concept.findMany({
      where: {
        status: 'accepted',
        source: {
          moduleId,
        },
      },
    });

    if (acceptedConcepts.length === 0) {
      throw new BadRequestException(
        'No accepted concepts found for this module. Please accept at least one concept before generating questions.',
      );
    }

    // Replace only AI-generated questions.
    // User-edited and approved questions are preserved.
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

    const oldQuestionIds = oldGeneratedQuestions.map((question) => question.id);

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

    const allNewQuestions: any[] = [];

    for (const concept of acceptedConcepts) {
      try {
        const prompt = `
For the concept "${concept.title}: ${concept.definition}", generate exactly 10 unique quiz questions.

Generate:
- 4 multiple choice questions
- 3 true/false questions
- 3 short-answer questions

MCQ rules:
- type must be "mcq"
- exactly 4 choices
- answer must exactly match one choice
- difficulty must be between 1 and 5

True/false rules:
- type must be "true_false"
- choices must be ["True", "False"]
- answer must be either "True" or "False"
- difficulty must be between 1 and 5

Short-answer rules:
- type must be "short_answer"
- choices must be null
- answer must contain the expected answer
- difficulty must be between 1 and 5

Important:
- Every question must be different.
- Do not repeat the same question with different wording.
- Questions must test different aspects of the concept.
- Return exactly 10 questions.
- Do not include any text outside the JSON object.

Respond ONLY with valid JSON.

Format:

{
  "questions": [
    {
      "type": "mcq",
      "text": "...",
      "answer": "...",
      "choices": ["...", "...", "...", "..."],
      "difficulty": 2
    },
    {
      "type": "true_false",
      "text": "...",
      "answer": "True",
      "choices": ["True", "False"],
      "difficulty": 1
    },
    {
      "type": "short_answer",
      "text": "...",
      "answer": "...",
      "choices": null,
      "difficulty": 3
    }
  ]
}
`;

        // =====================================================
        // GROQ AI GENERATION
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
          response_format: {
            type: 'json_object',
          },
        });

        const responseText = completion.choices[0]?.message?.content ?? '';

        const cleanedText = responseText.replace(/```json|```/g, '').trim();

        if (!cleanedText) {
          throw new Error('AI returned an empty response');
        }

        // =====================================================
        // PARSE AI RESPONSE
        // =====================================================

        const parsed = JSON.parse(cleanedText);

        const aiQuestions = parsed.questions;

        if (!Array.isArray(aiQuestions)) {
          throw new Error('AI did not return a questions array');
        }

        // =====================================================
        // SAVE AI RUN
        // =====================================================

        const aiRun = await this.prisma.aiRun.create({
          data: {
            model: 'openai/gpt-oss-20b',
            promptVersion: 'question-generator-v3',
            input: prompt,
            output: cleanedText,
          },
        });

        const generatedQuestionIds: number[] = [];

        // Prevent duplicate question text from being stored.
        const seenQuestions = new Set<string>();

        // =====================================================
        // SAVE QUESTIONS
        // =====================================================

        for (const q of aiQuestions) {
          if (!q || !['mcq', 'true_false', 'short_answer'].includes(q.type)) {
            continue;
          }

          if (!q.text || !q.answer) {
            continue;
          }

          const normalizedText = String(q.text)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');

          if (seenQuestions.has(normalizedText)) {
            continue;
          }

          seenQuestions.add(normalizedText);

          let choices: string[] | null = null;

          // ===================================================
          // MCQ
          // ===================================================

          if (q.type === 'mcq') {
            if (!Array.isArray(q.choices) || q.choices.length !== 4) {
              continue;
            }

            const mcqChoices = q.choices.map((choice: unknown) =>
              String(choice).trim(),
            );

            if (!mcqChoices.includes(String(q.answer).trim())) {
              continue;
            }

            choices = mcqChoices;
          }

          // ===================================================
          // TRUE / FALSE
          // ===================================================

          if (q.type === 'true_false') {
            choices = ['True', 'False'];

            if (!['True', 'False'].includes(String(q.answer).trim())) {
              continue;
            }
          }

          // ===================================================
          // SHORT ANSWER
          // ===================================================

          if (q.type === 'short_answer') {
            choices = null;
          }

          const difficulty = Math.min(
            5,
            Math.max(1, Number(q.difficulty) || 2),
          );

          // ===================================================
          // CREATE QUESTION
          // ===================================================

          const question = await this.prisma.question.create({
            data: {
              type: q.type,
              text: String(q.text).trim(),
              answer: String(q.answer).trim(),
              choices: choices ? JSON.stringify(choices) : null,
              difficulty,
              status: 'generated',
              aiRunId: aiRun.id,
            },
          });

          // ===================================================
          // LINK QUESTION TO CONCEPT
          // ===================================================

          await this.prisma.questionConcept.create({
            data: {
              questionId: question.id,
              conceptId: concept.id,
            },
          });

          // ===================================================
          // CREATE QUESTION VERSION
          // ===================================================

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

          allNewQuestions.push(question);
          generatedQuestionIds.push(question.id);
        }

        // =====================================================
        // AUDIT LOG
        // =====================================================

        await this.auditLogService.createLog(
          userId,
          'generate',
          'Question',
          concept.id,
          {
            retiredQuestionIds: oldQuestionIds,
          },
          {
            generatedQuestionIds,
          },
        );
      } catch (error) {
        console.log(
          `Question generation failed for concept ${concept.id}`,
          error,
        );
      }
    }

    return allNewQuestions;
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
