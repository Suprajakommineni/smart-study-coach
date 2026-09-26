import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import Groq from 'groq-sdk';

type RawQuestion = {
  conceptId: number;
  type: string;
  text: string;
  answer: string;
  choices: string[] | null;
  difficulty: number;
};

@Injectable()
export class QuestionService {
  private groq: Groq;

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  private buildSchema(count: number) {
    return {
      type: 'json_schema' as const,
      json_schema: {
        name: 'batch_questions',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              minItems: count,
              maxItems: count,
              items: {
                type: 'object',
                properties: {
                  conceptId: { type: 'integer' },
                  type: { type: 'string' },
                  text: { type: 'string' },
                  answer: { type: 'string' },
                  choices: { type: ['array', 'null'], items: { type: 'string' } },
                  difficulty: { type: 'integer', minimum: 1, maximum: 5 },
                },
                required: ['conceptId', 'type', 'text', 'answer', 'choices', 'difficulty'],
                additionalProperties: false,
              },
            },
          },
          required: ['questions'],
          additionalProperties: false,
        },
      },
    };
  }

  private async generateBatch(
    type: 'mcq' | 'true_false' | 'short_answer',
    count: number,
    conceptList: string,
  ): Promise<{ prompt: string; output: string; questions: RawQuestion[] }> {
    const typeInstructions: Record<string, string> = {
      mcq: `type = "mcq", exactly 4 choices, answer must exactly match one choice`,
      true_false: `type = "true_false", choices = ["True", "False"], answer = "True" or "False"`,
      short_answer: `type = "short_answer", choices = null, answer contains the expected answer`,
    };

    const prompt = `
Generate exactly ${count} ${type} quiz questions covering these accepted concepts, as evenly as reasonably possible:

${conceptList}

Every question must have a conceptId matching one of the concept IDs listed above.
${typeInstructions[type]}
Every question must be unique. Difficulty is an integer 1-5.
Do not create questions about concepts not listed above.
`;

    const completion = await this.groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      reasoning_effort: 'low',
      max_completion_tokens: 1800,
      response_format: this.buildSchema(count),
    });

    const responseText = completion.choices[0]?.message?.content ?? '';
    if (!responseText) throw new Error(`AI returned an empty response for ${type}`);

    const parsed = JSON.parse(responseText);
    if (!Array.isArray(parsed.questions)) {
      throw new Error(`AI response for ${type} did not contain a questions array`);
    }

    return { prompt, output: responseText, questions: parsed.questions };
  }

  // =========================================================
  // GENERATE 15 QUESTIONS FOR THE WHOLE MODULE
  // =========================================================

  async generateQuestions(moduleId: number, userId: number) {
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, subject: { workspace: { userId } } },
    });
    if (!module) throw new NotFoundException('Module not found');

    const acceptedConcepts = await this.prisma.concept.findMany({
      where: { status: 'accepted', source: { moduleId } },
      select: { id: true, title: true, definition: true },
    });

    if (acceptedConcepts.length === 0) {
      throw new BadRequestException(
        'No accepted concepts found for this module. Please accept at least one concept before generating questions.',
      );
    }

    const oldGeneratedQuestions = await this.prisma.question.findMany({
      where: {
        status: 'generated',
        concepts: { some: { concept: { source: { moduleId } } } },
      },
      select: { id: true },
    });
    const oldQuestionIds = oldGeneratedQuestions.map((q) => q.id);
    if (oldQuestionIds.length > 0) {
      await this.prisma.question.updateMany({
        where: { id: { in: oldQuestionIds }, status: 'generated' },
        data: { status: 'retired' },
      });
    }

    const conceptList = acceptedConcepts
      .map((c) => `Concept ID: ${c.id}\nTitle: ${c.title}\nDefinition: ${c.definition}`)
      .join('\n\n');

    try {
      const [mcqBatch, tfBatch, shortBatch] = await Promise.all([
        this.generateBatch('mcq', 6, conceptList),
        this.generateBatch('true_false', 5, conceptList),
        this.generateBatch('short_answer', 4, conceptList),
      ]);

      const combinedOutput = JSON.stringify({
        mcq: mcqBatch.output,
        true_false: tfBatch.output,
        short_answer: shortBatch.output,
      });
      const combinedPrompt = [mcqBatch.prompt, tfBatch.prompt, shortBatch.prompt].join('\n---\n');

      const aiRun = await this.prisma.aiRun.create({
        data: {
          model: 'openai/gpt-oss-20b',
          promptVersion: 'question-generator-v7-parallel',
          input: combinedPrompt,
          output: combinedOutput,
        },
      });

      const acceptedConceptIds = new Set(acceptedConcepts.map((c) => c.id));
      const seenQuestions = new Set<string>();
      const allRaw = [...mcqBatch.questions, ...tfBatch.questions, ...shortBatch.questions];

      const toCreate: {
        type: string;
        text: string;
        answer: string;
        choices: string[] | null;
        difficulty: number;
        conceptId: number;
      }[] = [];

      for (const q of allRaw) {
        const conceptId = Number(q.conceptId);
        if (!acceptedConceptIds.has(conceptId)) continue;
        if (!q.text?.trim() || !q.answer?.trim()) continue;

        const normalizedText = String(q.text).trim().toLowerCase().replace(/\s+/g, ' ');
        if (seenQuestions.has(normalizedText)) continue;
        seenQuestions.add(normalizedText);

        let choices: string[] | null = null;

        if (q.type === 'mcq') {
          if (!Array.isArray(q.choices) || q.choices.length !== 4) continue;
          const mcqChoices = q.choices.map((c: string) => c.trim());
          if (!mcqChoices.includes(String(q.answer).trim())) continue;
          choices = mcqChoices;
        }

        if (q.type === 'true_false') {
          choices = ['True', 'False'];
          if (!['True', 'False'].includes(String(q.answer).trim())) continue;
        }

        if (q.type === 'short_answer') {
          choices = null;
        }

        toCreate.push({
          type: q.type,
          text: String(q.text).trim(),
          answer: String(q.answer).trim(),
          choices,
          difficulty: q.difficulty,
          conceptId,
        });
      }

      if (toCreate.length === 0) {
        throw new Error('No valid questions survived validation');
      }

      const created = await Promise.all(
        toCreate.map(async (q) => {
          const question = await this.prisma.question.create({
            data: {
              type: q.type,
              text: q.text,
              answer: q.answer,
              choices: q.choices ? JSON.stringify(q.choices) : null,
              difficulty: q.difficulty,
              status: 'generated',
              aiRunId: aiRun.id,
            },
          });

          await Promise.all([
            this.prisma.questionConcept.create({
              data: { questionId: question.id, conceptId: q.conceptId },
            }),
            this.prisma.questionVersion.create({
              data: {
                questionId: question.id,
                version: 1,
                text: question.text,
                answer: question.answer,
                choices: question.choices,
                difficulty: question.difficulty,
              },
            }),
          ]);

          return question.id;
        }),
      );

      await this.auditLogService.createLog(
        userId,
        'generate',
        'Question',
        moduleId,
        { retiredQuestionIds: oldQuestionIds },
        {
          generatedQuestionIds: created,
          questionCount: created.length,
          conceptIds: acceptedConcepts.map((c) => c.id),
        },
      );

      return this.prisma.question.findMany({
        where: { id: { in: created } },
        include: {
          concepts: { include: { concept: true } },
          versions: { orderBy: { version: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.log(`Question generation failed for module ${moduleId}`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to generate questions',
      );
    }
  }

  // =========================================================
  // GET QUESTIONS
  // =========================================================

  async findAllForModule(moduleId: number, userId: number) {
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, subject: { workspace: { userId } } },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return this.prisma.question.findMany({
      where: {
        status: { not: 'retired' },
        concepts: {
          some: {
            concept: {
              status: 'accepted',
              source: { moduleId },
            },
          },
        },
      },
      include: {
        concepts: { include: { concept: true } },
        versions: { orderBy: { version: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
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
                    workspace: { userId },
                  },
                },
              },
            },
          },
        },
      },
      include: {
        concepts: true,
        versions: { orderBy: { version: 'desc' }, take: 1 },
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
      data.choices && data.choices.length > 0 ? JSON.stringify(data.choices) : null;

    const updatedQuestion = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: { id: questionId },
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

      await tx.questionConcept.deleteMany({ where: { questionId } });

      if (data.conceptIds.length > 0) {
        await tx.questionConcept.createMany({
          data: data.conceptIds.map((conceptId) => ({ questionId, conceptId })),
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
      where: { id: questionId },
      data: { status: 'approved' },
    });

    await this.auditLogService.createLog(
      userId,
      'approve',
      'Question',
      questionId,
      { status: question.status },
      { status: 'approved' },
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
      where: { id: questionId },
      data: { status: 'retired' },
    });

    await this.auditLogService.createLog(
      userId,
      'retire',
      'Question',
      questionId,
      { status: question.status },
      { status: 'retired' },
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
                    workspace: { userId },
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