import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MasteryService } from '../mastery/mastery.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import Groq from 'groq-sdk';

@Injectable()
export class StudySessionService {
   private groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
  constructor(private prisma: PrismaService,
    private masteryService: MasteryService,
    private auditLogService: AuditLogService
  ) {}

  async startSession(
    userId: number,
    moduleId: number,
    questionCount: number,
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
    const availableQuestions = await this.prisma.question.findMany({
      where: {
        status: { not: 'retired' },
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
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 1,
        },
      },
      take: questionCount,
    });

    if (availableQuestions.length === 0) {
      throw new Error('No questions available for this module');
    }

    const session = await this.prisma.studySession.create({
      data: {
        userId,
        moduleId,
        questionCount: availableQuestions.length,
      },
    });

    const questionsForClient = availableQuestions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      choices: q.choices,
      difficulty: q.difficulty,
    }));

    return {
      session,
      questions: questionsForClient,
    };
  }

async submitAttempt(
  studySessionId: number,
  userId: number,
  questionId: number,
  userAnswer: string,
  timeTaken?: number,
) {
  const session = await this.prisma.studySession.findFirst({
  where: {
    id: studySessionId,
    userId,
  },
});

if (!session) {
  throw new Error('Study session not found');
}
  const question = await this.prisma.question.findFirst({
  where: {
    id: questionId,
    status: {
      not: 'retired',
    },
    concepts: {
      some: {
        concept: {
          source: {
            moduleId: session.moduleId,
          },
        },
      },
    },
  },
  include: {
    versions: {
      orderBy: {
        version: 'desc',
      },
      take: 1,
    },
    concepts: {
      include: {
        concept: true,
      },
    },
  },
});

if (!question) {
  throw new Error('Question does not belong to this study session');
}

const existingAttempt = await this.prisma.attempt.findFirst({
  where: {
    studySessionId,
    questionId,
  },
});

if (existingAttempt) {
  throw new Error('This question has already been answered in this session');
}
  const questionVersion = question.versions[0];

  if (!questionVersion) {
    throw new Error('Question version not found');
  }

  let result: string;
  let aiRationale: string | undefined;
  let aiRunId: number | undefined;
  let aiConfidence: number | undefined;
  let aiResult: string | undefined;

  // MCQ and True/False → deterministic grading
  if (
    question.type === 'mcq' ||
    question.type === 'true_false'
  ) {
    result =
      userAnswer.trim().toLowerCase() ===
      question.answer.trim().toLowerCase()
        ? 'correct'
        : 'incorrect';
  }

  // Short answer → AI grading
  else {
    const prompt = `
You are grading a short-answer study question.

Question:
${question.text}

Expected answer:
${question.answer}

Student answer:
${userAnswer}

Evaluate the student's answer.

Return ONLY valid JSON in this exact format:
{
  "result": "correct" | "partial" | "incorrect",
  "rationale": "short explanation",
  "confidence": 0.0
}

Rules:
- correct = answer is substantially correct
- partial = answer contains some correct understanding but is incomplete
- incorrect = answer is substantially wrong
- confidence must be between 0 and 1
`;

    const completion = await this.groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const aiOutput =
      completion.choices[0]?.message?.content?.trim();

    if (!aiOutput) {
      throw new Error('AI grading returned no result');
    }

    let parsedResult: {
      result: string;
      rationale: string;
      confidence: number;
    };

    try {
      parsedResult = JSON.parse(aiOutput);
    } catch {
      throw new Error('AI grading returned invalid JSON');
    }

    result = parsedResult.result;
    aiResult = parsedResult.result;
    aiRationale = parsedResult.rationale;
    aiConfidence = parsedResult.confidence;

    const aiRun = await this.prisma.aiRun.create({
  data: {
    model: 'openai/gpt-oss-20b',
    promptVersion: 'short-answer-grading-v1',
    input: prompt,
    output: aiOutput,
  },
});

aiRunId = aiRun.id;
  }

 const attempt = await this.prisma.attempt.create({
  data: {
    studySessionId,
    questionId,
    questionVersionId: questionVersion.id,
    answer: userAnswer,
    result,
    aiRunId,
    aiResult,
    aiRationale,
    aiConfidence,
    timeTaken,
  },
});

 await this.auditLogService.createLog(
  userId,
  'submit_attempt',
  'Attempt',
  attempt.id,
  null,
  attempt,
);

  // Update mastery for correct/incorrect answers.
  // Partial answers will be handled when we improve
  // mastery scoring for partial results.
  if (
    result === 'correct' ||
    result === 'incorrect'
  ) {
    for (const questionConcept of question.concepts) {
      let mastery = await this.prisma.mastery.findUnique({
        where: {
          conceptId: questionConcept.conceptId,
        },
      });

      if (!mastery) {
        mastery = await this.prisma.mastery.create({
          data: {
            conceptId: questionConcept.conceptId,
          },
        });
      }

      await this.masteryService.updateMastery(
        attempt.id,
        mastery.id,
      );
    }
  }

  return attempt;
}

  async getSessionResults(studySessionId: number, userId: number) {
    const session = await this.prisma.studySession.findFirst({
  where: {
    id: studySessionId,
    userId,
  },
});

if (!session) {
  throw new Error('Study session not found');
}
    return this.prisma.attempt.findMany({
      where: {
        studySessionId,
      },
      include: {
        question: true,
        questionVersion: true,
      },
    });
  }
  async overrideAttempt(
  attemptId: number,
  userId: number,
  result: string,
  reason?: string,
) {
  const allowedResults = ['correct', 'partial', 'incorrect'];

  if (!allowedResults.includes(result)) {
    throw new Error('Invalid result');
  }

  const attempt = await this.prisma.attempt.findUnique({
    where: {
      id: attemptId,
    },
  });

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  const updatedAttempt = await this.prisma.attempt.update({
    where: {
      id: attemptId,
    },
    data: {
      result,
      userOverride: result,
      overrideReason: reason,
      overriddenAt: new Date(),
    },
  });

  await this.auditLogService.createLog(
    userId,
    'override_grade',
    'Attempt',
    attemptId,
    attempt,
    updatedAttempt,
  );

  return updatedAttempt;
}
}