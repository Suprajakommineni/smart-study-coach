import { Injectable } from '@nestjs/common';
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

  async generateQuestions(
    moduleId: number,
    userId: number,
  ) {
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
  throw new Error('Module not found');
}
    const acceptedConcepts =
      await this.prisma.concept.findMany({
        where: {
          status: 'accepted',
          source: {
            moduleId,
          },
        },
      });

    if (acceptedConcepts.length === 0) {
      throw new Error(
        'No accepted concepts found for this module',
      );
    }

    // Find existing generated questions for this module
    const oldGeneratedQuestions =
      await this.prisma.question.findMany({
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

    const oldQuestionIds =
      oldGeneratedQuestions.map(
        (question) => question.id,
      );

    // Retire old generated questions instead of deleting them.
    // This preserves attempts and question versions.
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

    const allNewQuestions = [];

    for (const concept of acceptedConcepts) {
      try {
        const prompt = `
For the concept "${concept.title}: ${concept.definition}", generate 2 quiz questions:

- One multiple choice question with 4 options
- One true/false question

For the multiple choice question:
- type must be "mcq"
- choices must contain exactly 4 options
- answer must be one of the choices
- difficulty must be between 1 and 5

For the true/false question:
- type must be "true_false"
- choices must be ["True", "False"]
- answer must be either "True" or "False"
- difficulty must be between 1 and 5

Respond ONLY with valid JSON.

Use exactly this format:

[
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
  }
]
`;

        const completion =
          await this.groq.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0,
          });

        const responseText =
          completion.choices[0]?.message?.content ?? '';

        const cleanedText = responseText
          .replace(/```json|```/g, '')
          .trim();

        const aiQuestions = JSON.parse(cleanedText);

        const aiRun = await this.prisma.aiRun.create({
          data: {
            model: 'openai/gpt-oss-20b',
            promptVersion: 'question-generator-v1',
            input: prompt,
            output: cleanedText,
          },
        });

        const generatedQuestionIds: number[] = [];

        for (const q of aiQuestions) {
          const question =
            await this.prisma.question.create({
              data: {
                type: q.type,
                text: q.text,
                answer: q.answer,
                choices: q.choices
                  ? JSON.stringify(q.choices)
                  : null,
                difficulty: q.difficulty ?? 2,
                status: 'generated',
                aiRunId: aiRun.id,
              },
            });

          await this.prisma.questionConcept.create({
            data: {
              questionId: question.id,
              conceptId: concept.id,
            },
          });

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

        continue;
      }
    }

    return allNewQuestions;
  }

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
  throw new Error('Module not found');
}
    return this.prisma.question.findMany({
      where: {
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
      include: {
        concepts: {
          include: {
            concept: true,
          },
        },
        versions: true,
      },
    });
  }
}