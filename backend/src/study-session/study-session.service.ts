import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StudySessionService {
  constructor(private prisma: PrismaService) {}

  async startSession(moduleId: number, questionCount: number) {
    const availableQuestions = await this.prisma.question.findMany({
      where: {
        concept: {
          source: { moduleId },
        },
        status: { not: 'retired' },
      },
      take: questionCount,
    });

    if (availableQuestions.length === 0) {
      throw new Error('No questions available for this module');
    }

    const session = await this.prisma.studySession.create({
      data: {
        moduleId,
        questionCount: availableQuestions.length,
      },
    });

    // Don't send the correct answer to the frontend
    const questionsForClient = availableQuestions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      choices: q.choices,
      difficulty: q.difficulty,
    }));

    return { session, questions: questionsForClient };
  }

  async submitAttempt(
    studySessionId: number,
    questionId: number,
    userAnswer: string,
    timeTaken?: number,
  ) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');

    let result: string;

    if (question.type === 'mcq' || question.type === 'true_false') {
      result = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
        ? 'correct'
        : 'incorrect';
    } else {
      // short answer — would need AI grading; for now, mark as needing review
      result = 'needs_review';
    }

    const attempt = await this.prisma.attempt.create({
      data: {
        studySessionId,
        questionId,
        answer: userAnswer,
        result,
        timeTaken,
      },
    });

    return attempt;
  }

  async getSessionResults(studySessionId: number) {
    return this.prisma.attempt.findMany({
      where: { studySessionId },
      include: { questions: true },
    });
  }
}