import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import Groq from 'groq-sdk';

type QuestionType = 'mcq' | 'true_false' | 'short_answer';

@Injectable()
export class StudySessionService {
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
  // START STUDY SESSION
  // =========================================================

  async startSession(
    moduleId: number,
    userId: number,
    questionCount: number,
    questionTypes?: QuestionType[],
  ) {
    // -------------------------------------------------------
    // 1. Validate question count
    // -------------------------------------------------------

    if (questionCount < 1 || questionCount > 50) {
      throw new BadRequestException('Question count must be between 1 and 50');
    }

    // -------------------------------------------------------
    // 2. Verify module belongs to logged-in user
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // 3. Determine selected question types
    // -------------------------------------------------------

    const allowedTypes: QuestionType[] = ['mcq', 'true_false', 'short_answer'];

    const selectedTypes =
      questionTypes && questionTypes.length > 0
        ? [
            ...new Set(
              questionTypes.filter((type) => allowedTypes.includes(type)),
            ),
          ]
        : allowedTypes;

    if (selectedTypes.length === 0) {
      throw new BadRequestException(
        'At least one question type must be selected',
      );
    }

    // -------------------------------------------------------
    // 4. Get ALL questions from ALL accepted concepts
    //    across ALL sources belonging to this module
    // -------------------------------------------------------

    const questions = await this.prisma.question.findMany({
      where: {
        status: {
          not: 'retired',
        },

        type: {
          in: selectedTypes,
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
        versions: {
          orderBy: {
            version: 'desc',
          },

          take: 1,
        },

        concepts: {
          include: {
            concept: {
              select: {
                id: true,
                title: true,
                sourceId: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        'No questions are available for the selected question types.',
      );
    }

    // -------------------------------------------------------
    // 5. Remove duplicate question text
    // -------------------------------------------------------

    const uniqueQuestions: typeof questions = [];

    const seenTexts = new Set<string>();

    for (const question of questions) {
      const normalizedText = question.text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      if (seenTexts.has(normalizedText)) {
        continue;
      }

      seenTexts.add(normalizedText);

      uniqueQuestions.push(question);
    }

    // -------------------------------------------------------
    // 6. Get questions already attempted by this user
    //    inside this module
    // -------------------------------------------------------

    const previousAttempts = await this.prisma.attempt.findMany({
      where: {
        studySession: {
          userId,
          moduleId,
        },
      },

      select: {
        questionId: true,
      },

      distinct: ['questionId'],
    });

    const previouslyUsedIds = new Set(
      previousAttempts.map((attempt) => attempt.questionId),
    );

    // -------------------------------------------------------
    // 7. Separate fresh and previously used questions
    // -------------------------------------------------------

    const freshQuestions = uniqueQuestions.filter(
      (question) => !previouslyUsedIds.has(question.id),
    );

    const previouslyUsedQuestions = uniqueQuestions.filter((question) =>
      previouslyUsedIds.has(question.id),
    );

    // -------------------------------------------------------
    // 8. Prefer fresh questions
    //
    // If enough fresh questions exist, use only them.
    //
    // If not enough fresh questions exist, use the
    // previously attempted questions as fallback.
    // -------------------------------------------------------

    let availableQuestions = [...freshQuestions, ...previouslyUsedQuestions];

    if (availableQuestions.length < questionCount) {
      throw new BadRequestException(
        `Only ${availableQuestions.length} unique questions are available for this module. Generate more questions before selecting ${questionCount}.`,
      );
    }

    // -------------------------------------------------------
    // 9. Group available questions by concept
    //
    // This allows us to cover multiple concepts instead
    // of taking everything from one concept.
    // -------------------------------------------------------

    const questionsByConcept = new Map<number, typeof questions>();

    for (const question of availableQuestions) {
      // A question normally belongs to one concept.
      // If it belongs to multiple concepts, use the first
      // accepted concept for distribution.
      const conceptRelation = question.concepts.find(
        (item) => item.concept.sourceId !== undefined,
      );

      if (!conceptRelation) {
        continue;
      }

      const conceptId = conceptRelation.concept.id;

      if (!questionsByConcept.has(conceptId)) {
        questionsByConcept.set(conceptId, []);
      }

      questionsByConcept.get(conceptId)!.push(question);
    }

    // -------------------------------------------------------
    // 10. Shuffle questions inside each concept
    // -------------------------------------------------------

    for (const conceptQuestions of questionsByConcept.values()) {
      this.shuffle(conceptQuestions);
    }

    // -------------------------------------------------------
    // 11. Create concept queues
    // -------------------------------------------------------

    const conceptQueues = Array.from(questionsByConcept.entries()).map(
      ([conceptId, conceptQuestions]) => ({
        conceptId,
        questions: conceptQuestions,
        index: 0,
      }),
    );

    // -------------------------------------------------------
    // 12. Shuffle concept order
    // -------------------------------------------------------

    this.shuffle(conceptQueues);

    // -------------------------------------------------------
    // 13. Select questions round-robin
    //
    // Example:
    //
    // Concept A → Q1 Q2 Q3
    // Concept B → Q4 Q5 Q6
    // Concept C → Q7 Q8 Q9
    //
    // Selecting 5:
    //
    // Q1 → Concept A
    // Q4 → Concept B
    // Q7 → Concept C
    // Q2 → Concept A
    // Q5 → Concept B
    // -------------------------------------------------------

    const selectedQuestions: typeof questions = [];

    while (
      selectedQuestions.length < questionCount &&
      conceptQueues.length > 0
    ) {
      let addedQuestion = false;

      for (const queue of conceptQueues) {
        if (queue.index >= queue.questions.length) {
          continue;
        }

        const question = queue.questions[queue.index];

        queue.index++;

        // Extra duplicate protection
        const alreadySelected = selectedQuestions.some(
          (selected) => selected.id === question.id,
        );

        if (alreadySelected) {
          continue;
        }

        selectedQuestions.push(question);

        addedQuestion = true;

        if (selectedQuestions.length >= questionCount) {
          break;
        }
      }

      if (!addedQuestion) {
        break;
      }
    }

    // -------------------------------------------------------
    // 14. Safety fallback
    //
    // In case some questions were not assigned to a concept
    // queue, fill remaining slots from available questions.
    // -------------------------------------------------------

    if (selectedQuestions.length < questionCount) {
      for (const question of availableQuestions) {
        if (selectedQuestions.some((selected) => selected.id === question.id)) {
          continue;
        }

        selectedQuestions.push(question);

        if (selectedQuestions.length >= questionCount) {
          break;
        }
      }
    }

    // -------------------------------------------------------
    // 15. Final validation
    // -------------------------------------------------------

    if (selectedQuestions.length < questionCount) {
      throw new BadRequestException(
        `Only ${selectedQuestions.length} unique questions could be selected.`,
      );
    }

    // -------------------------------------------------------
    // 16. Shuffle final question order
    // -------------------------------------------------------

    this.shuffle(selectedQuestions);

    // -------------------------------------------------------
    // 17. Create study session
    // -------------------------------------------------------

    const session = await this.prisma.studySession.create({
      data: {
        userId,
        moduleId,
        questionCount: selectedQuestions.length,
      },
    });

    // -------------------------------------------------------
    // 18. Audit
    // -------------------------------------------------------

    await this.auditLogService.createLog(
      userId,
      'start',
      'StudySession',
      session.id,
      null,
      {
        moduleId,

        questionCount: selectedQuestions.length,

        questionTypes: selectedTypes,

        questionIds: selectedQuestions.map((question) => question.id),
      },
    );

    // -------------------------------------------------------
    // 19. Return questions
    // -------------------------------------------------------

    return {
      session: {
        id: session.id,
        moduleId: session.moduleId,
        questionCount: session.questionCount,
      },

      questions: selectedQuestions.map((question) => {
        let choices: string[] | null = null;

        // MCQ choices
        if (question.type === 'mcq' && question.choices) {
          try {
            const parsed = JSON.parse(question.choices);

            if (Array.isArray(parsed)) {
              choices = parsed.map((choice) => String(choice));
            }
          } catch {
            choices = null;
          }
        }

        // True / False choices
        if (question.type === 'true_false') {
          choices = ['True', 'False'];
        }

        // Short answer has no choices
        if (question.type === 'short_answer') {
          choices = null;
        }

        return {
          id: question.id,

          type: question.type as QuestionType,

          text: question.text,

          choices,

          difficulty: question.difficulty,
        };
      }),
    };
  }

  // =========================================================
  // SUBMIT ATTEMPT
  // =========================================================

  async submitAttempt(
    sessionId: number,
    userId: number,
    questionId: number,
    answer: string,
    timeTaken?: number,
  ) {
    if (!answer || !answer.trim()) {
      throw new BadRequestException('Answer is required');
    }

    if (
      timeTaken !== undefined &&
      (timeTaken < 0 || !Number.isFinite(timeTaken))
    ) {
      throw new BadRequestException('Invalid time taken value');
    }

    const session = await this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Study session not found');
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
              status: 'accepted',

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
      throw new NotFoundException('Question not found for this study session');
    }

    // -------------------------------------------------------
    // Prevent duplicate submission
    // -------------------------------------------------------

    const existingAttempt = await this.prisma.attempt.findFirst({
      where: {
        studySessionId: sessionId,
        questionId,
      },
    });

    if (existingAttempt) {
      throw new BadRequestException('This question has already been answered');
    }

    const questionVersion = question.versions[0];

    if (!questionVersion) {
      throw new BadRequestException('Question version not found');
    }

    let result: 'correct' | 'incorrect' | 'partial';

    let aiRunId: number | undefined;
    let aiRationale: string | undefined;
    let aiConfidence: number | undefined;

    // =======================================================
    // MCQ
    // =======================================================

    if (question.type === 'mcq') {
      result =
        this.normalizeAnswer(answer) ===
        this.normalizeAnswer(questionVersion.answer)
          ? 'correct'
          : 'incorrect';
    }

    // =======================================================
    // TRUE / FALSE
    // =======================================================
    else if (question.type === 'true_false') {
      result =
        this.normalizeAnswer(answer) ===
        this.normalizeAnswer(questionVersion.answer)
          ? 'correct'
          : 'incorrect';
    }

    // =======================================================
    // SHORT ANSWER
    // =======================================================
    else if (question.type === 'short_answer') {
      const grading = await this.gradeShortAnswer(
        questionVersion.text,
        questionVersion.answer,
        answer,
      );

      result = grading.result;

      aiRationale = grading.rationale;

      aiConfidence = grading.confidence;

      const aiRun = await this.prisma.aiRun.create({
        data: {
          model: 'openai/gpt-oss-20b',

          promptVersion: 'short-answer-grader-v1',

          input: grading.prompt,

          output: grading.rawOutput,
        },
      });

      aiRunId = aiRun.id;
    } else {
      throw new BadRequestException('Unsupported question type');
    }

    // =======================================================
    // TRANSACTION
    // Attempt + mastery update
    // =======================================================

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.attempt.create({
        data: {
          studySessionId: sessionId,

          questionId,

          questionVersionId: questionVersion.id,

          answer: answer.trim(),

          result,

          aiRunId,

          aiRationale,

          aiConfidence,

          timeTaken,
        },
      });

      const conceptIds = question.concepts
        .filter((item) => item.concept.status === 'accepted')
        .map((item) => item.conceptId);

      for (const conceptId of conceptIds) {
        await this.recalculateMastery(tx, conceptId);
      }

      return attempt;
    });

    // -------------------------------------------------------
    // Audit attempt
    // -------------------------------------------------------

    await this.auditLogService.createLog(
      userId,
      'submit',
      'Attempt',
      transactionResult.id,
      null,
      {
        sessionId,
        questionId,
        questionVersionId: questionVersion.id,
        result,
        answer: answer.trim(),
        timeTaken,
        aiRationale,
        aiConfidence,
      },
    );

    return {
      attemptId: transactionResult.id,

      questionId,

      result,

      aiRationale: aiRationale ?? null,

      aiConfidence: aiConfidence ?? null,
    };
  }

  // =========================================================
  // SHORT ANSWER AI GRADING
  // =========================================================

  private async gradeShortAnswer(
    questionText: string,
    expectedAnswer: string,
    userAnswer: string,
  ) {
    const prompt = `
You are grading a student's short answer.

Question:
${questionText}

Expected answer:
${expectedAnswer}

Student answer:
${userAnswer}

Return ONLY valid JSON:

{
  "result": "correct" | "partial" | "incorrect",
  "rationale": "brief explanation",
  "confidence": number
}

Rules:
- correct = answer demonstrates the expected concept accurately.
- partial = answer contains some correct understanding but is incomplete or partly incorrect.
- incorrect = answer does not demonstrate the expected concept.
- confidence must be between 0 and 1.
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

    const rawOutput = completion.choices[0]?.message?.content ?? '';

    try {
      const cleaned = rawOutput.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(cleaned);

      const validResults = ['correct', 'partial', 'incorrect'];

      const result = validResults.includes(parsed.result)
        ? parsed.result
        : 'incorrect';

      const confidence = Math.max(
        0,
        Math.min(1, Number(parsed.confidence) || 0),
      );

      return {
        result: result as 'correct' | 'partial' | 'incorrect',

        rationale:
          typeof parsed.rationale === 'string'
            ? parsed.rationale
            : 'Answer evaluated by AI.',

        confidence,

        prompt,

        rawOutput,
      };
    } catch {
      return {
        result: 'incorrect' as const,

        rationale: 'The answer could not be confidently evaluated.',

        confidence: 0,

        prompt,

        rawOutput,
      };
    }
  }

  // =========================================================
  // OVERRIDE ATTEMPT
  // =========================================================

  async overrideAttempt(
    attemptId: number,
    userId: number,
    result: 'correct' | 'partial' | 'incorrect',
    reason?: string,
  ) {
    if (!['correct', 'partial', 'incorrect'].includes(result)) {
      throw new BadRequestException('Invalid result');
    }

    const attempt = await this.prisma.attempt.findFirst({
      where: {
        id: attemptId,

        studySession: {
          userId,
        },
      },

      include: {
        question: {
          include: {
            concepts: {
              include: {
                concept: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    const beforeData = {
      result: attempt.result,
      userOverride: attempt.userOverride,
      overrideReason: attempt.overrideReason,
    };

    const updatedAttempt = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.attempt.update({
        where: {
          id: attemptId,
        },

        data: {
          userOverride: result,

          overrideReason: reason?.trim() || null,

          overriddenAt: new Date(),

          result,
        },
      });

      const conceptIds = attempt.question.concepts
        .filter((item) => item.concept.status === 'accepted')
        .map((item) => item.conceptId);

      for (const conceptId of conceptIds) {
        await this.recalculateMastery(tx, conceptId);
      }

      return updated;
    });

    await this.auditLogService.createLog(
      userId,
      'override',
      'Attempt',
      attemptId,
      beforeData,
      {
        result,
        userOverride: result,
        overrideReason: reason?.trim() || null,
      },
    );

    return updatedAttempt;
  }

  // =========================================================
  // SESSION RESULTS
  // =========================================================

  async getResults(sessionId: number, userId: number) {
    const session = await this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },

      include: {
        attempts: {
          include: {
            question: {
              include: {
                concepts: {
                  include: {
                    concept: true,
                  },
                },
              },
            },

            questionVersion: true,
          },

          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    const total = session.attempts.length;

    const correct = session.attempts.filter(
      (attempt) => attempt.result === 'correct',
    ).length;

    const incorrect = session.attempts.filter(
      (attempt) => attempt.result === 'incorrect',
    ).length;

    const partial = session.attempts.filter(
      (attempt) => attempt.result === 'partial',
    ).length;

    const accuracy =
      total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));

    return {
      session: {
        id: session.id,
        moduleId: session.moduleId,
        questionCount: session.questionCount,
        createdAt: session.createdAt,
      },

      summary: {
        total,
        correct,
        incorrect,
        partial,
        accuracy,
      },

      attempts: session.attempts.map((attempt) => ({
        id: attempt.id,

        questionId: attempt.questionId,

        questionVersionId: attempt.questionVersionId,

        question: {
          text: attempt.questionVersion.text,

          type: attempt.question.type,
        },

        answer: attempt.answer,

        result: attempt.result,

        aiRationale: attempt.aiRationale ?? null,

        aiConfidence: attempt.aiConfidence ?? null,

        userOverride: attempt.userOverride ?? null,

        overrideReason: attempt.overrideReason ?? null,

        timeTaken: attempt.timeTaken ?? null,

        createdAt: attempt.createdAt,
      })),
    };
  }

  // =========================================================
  // MASTERY
  // =========================================================

  private async recalculateMastery(tx: any, conceptId: number) {
    const attempts = await tx.attempt.findMany({
      where: {
        question: {
          concepts: {
            some: {
              conceptId,
            },
          },
        },
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    let score = 0;

    let correctStreak = 0;

    let incorrectStreak = 0;

    for (const attempt of attempts) {
      const result = attempt.userOverride || attempt.result;

      const daysSinceAttempt = Math.max(
        0,
        (Date.now() - new Date(attempt.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const recencyWeight =
        daysSinceAttempt <= 1
          ? 1
          : daysSinceAttempt <= 7
            ? 0.8
            : daysSinceAttempt <= 30
              ? 0.5
              : 0.3;

      if (result === 'correct') {
        score += 10 * recencyWeight;

        correctStreak += 1;

        incorrectStreak = 0;
      } else if (result === 'partial') {
        score += 5 * recencyWeight;

        correctStreak = 0;

        incorrectStreak = 0;
      } else {
        score -= 15 * recencyWeight;

        correctStreak = 0;

        incorrectStreak += 1;
      }

      score = Math.max(0, Math.min(100, score));
    }

    const lastAttempt =
      attempts.length > 0 ? attempts[attempts.length - 1] : null;

    const lastStudiedAt = lastAttempt?.createdAt ?? null;

    let bucket: string;

    if (score < 25) {
      bucket = 'New';
    } else if (score < 50) {
      bucket = 'Learning';
    } else if (score < 75) {
      bucket = 'Proficient';
    } else {
      bucket = 'Mastered';
    }

    let reviewInterval: number;

    if (incorrectStreak >= 2 || score < 25) {
      reviewInterval = 1;
    } else if (score < 50) {
      reviewInterval = 2;
    } else if (score < 75) {
      reviewInterval = 4;
    } else if (correctStreak >= 3) {
      reviewInterval = 7;
    } else {
      reviewInterval = 5;
    }

    const nextReviewAt = lastStudiedAt
      ? new Date(
          new Date(lastStudiedAt).getTime() +
            reviewInterval * 24 * 60 * 60 * 1000,
        )
      : null;

    const mastery = await tx.mastery.upsert({
      where: {
        conceptId,
      },

      create: {
        conceptId,
        score,
        bucket,
        lastStudiedAt,
        nextReviewAt,
        reviewInterval,
        correctStreak,
        incorrectStreak,
      },

      update: {
        score,
        bucket,
        lastStudiedAt,
        nextReviewAt,
        reviewInterval,
        correctStreak,
        incorrectStreak,
      },
    });

    return mastery;
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private normalizeAnswer(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
