import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

@Injectable()
export class MasteryService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  private getRecencyWeight(createdAt: Date): number {
    const now = new Date();

    const ageInDays =
      (now.getTime() - createdAt.getTime()) /
      (1000 * 60 * 60 * 24);

    if (ageInDays <= 1) return 1.0;
    if (ageInDays <= 7) return 0.8;
    if (ageInDays <= 30) return 0.5;

    return 0.3;
  }

  private getBucket(score: number): string {
    if (score < 25) return 'New';
    if (score < 50) return 'Learning';
    if (score < 75) return 'Proficient';

    return 'Mastered';
  }

  private getReviewInterval(
    score: number,
    correctStreak: number,
    incorrectStreak: number,
  ): number {
    if (incorrectStreak >= 2) return 1;

    if (score < 25) return 1;

    if (score < 50) return 2;

    if (score < 75) return 4;

    if (correctStreak >= 3) return 7;

    return 5;
  }

  async updateMastery(
    attemptId: number,
    masteryId: number,
  ) {
    const attempt = await this.prisma.attempt.findUnique({
      where: {
        id: attemptId,
      },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const mastery = await this.prisma.mastery.findUnique({
      where: {
        id: masteryId,
      },
    });

    if (!mastery) {
      throw new Error('Mastery record not found');
    }

    const beforeMastery = mastery;

    const weight = this.getRecencyWeight(
      attempt.createdAt,
    );

    let newScore = mastery.score;

    let correctStreak = mastery.correctStreak;
    let incorrectStreak = mastery.incorrectStreak;

    if (attempt.result === 'correct') {
      newScore += 10 * weight;

      correctStreak += 1;
      incorrectStreak = 0;
    }

    if (attempt.result === 'incorrect') {
      newScore -= 15 * weight;

      incorrectStreak += 1;
      correctStreak = 0;
    }

    if (attempt.result === 'partial') {
      newScore += 5 * weight;

      correctStreak = 0;
      incorrectStreak = 0;
    }

    newScore = Math.max(
      0,
      Math.min(100, newScore),
    );

    const bucket = this.getBucket(newScore);

    const reviewInterval = this.getReviewInterval(
      newScore,
      correctStreak,
      incorrectStreak,
    );

    const lastStudiedAt = new Date();

    const nextReviewAt = new Date();

    nextReviewAt.setDate(
      nextReviewAt.getDate() + reviewInterval,
    );

    const updatedMastery =
      await this.prisma.mastery.update({
        where: {
          id: masteryId,
        },
        data: {
          score: newScore,
          bucket,
          correctStreak,
          incorrectStreak,
          reviewInterval,
          lastStudiedAt,
          nextReviewAt,
        },
      });

    await this.auditLogService.createLog(
      null,
      'mastery_recalculated',
      'Mastery',
      masteryId,
      beforeMastery,
      updatedMastery,
    );

    return updatedMastery;
  }

  async recalculateMastery(
    conceptId: number,
  ) {
    const mastery = await this.prisma.mastery.findUnique({
      where: {
        conceptId,
      },
    });

    if (!mastery) {
      throw new Error('Mastery record not found');
    }

    const attempts =
      await this.prisma.attempt.findMany({
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
      const weight = this.getRecencyWeight(
        attempt.createdAt,
      );

      if (attempt.result === 'correct') {
        score += 10 * weight;

        correctStreak += 1;
        incorrectStreak = 0;
      } else if (attempt.result === 'incorrect') {
        score -= 15 * weight;

        incorrectStreak += 1;
        correctStreak = 0;
      } else if (attempt.result === 'partial') {
        score += 5 * weight;

        correctStreak = 0;
        incorrectStreak = 0;
      }
    }

    score = Math.max(
      0,
      Math.min(100, score),
    );

    const bucket = this.getBucket(score);

    const reviewInterval = this.getReviewInterval(
      score,
      correctStreak,
      incorrectStreak,
    );

    const lastAttempt =
      attempts[attempts.length - 1];

    const lastStudiedAt =
      lastAttempt?.createdAt ?? null;

    const nextReviewAt = new Date();

    nextReviewAt.setDate(
      nextReviewAt.getDate() + reviewInterval,
    );

    const beforeMastery = mastery;

    const updatedMastery =
      await this.prisma.mastery.update({
        where: {
          conceptId,
        },
        data: {
          score,
          bucket,
          correctStreak,
          incorrectStreak,
          reviewInterval,
          lastStudiedAt,
          nextReviewAt,
        },
      });

    await this.auditLogService.createLog(
      null,
      'mastery_recalculated',
      'Mastery',
      mastery.id,
      beforeMastery,
      updatedMastery,
    );

    return updatedMastery;
  }
  async getDueReason(conceptId: number) {
  const mastery = await this.prisma.mastery.findUnique({
    where: {
      conceptId,
    },
  });

  if (!mastery) {
    throw new Error('Mastery record not found');
  }

  const reasons: string[] = [];

  // Never studied
  if (!mastery.lastStudiedAt) {
    reasons.push('This concept has not been studied yet');
  } else {
    const now = new Date();

    const daysSinceLastStudy = Math.floor(
      (now.getTime() - mastery.lastStudiedAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastStudy > 0) {
      reasons.push(
        `${daysSinceLastStudy} day${
          daysSinceLastStudy === 1 ? '' : 's'
        } since last review`,
      );
    }
  }

  reasons.push(
    `mastery ${Math.round(mastery.score)}`,
  );

  if (mastery.incorrectStreak > 0) {
    reasons.push(
      `${mastery.incorrectStreak} incorrect attempt${
        mastery.incorrectStreak === 1 ? '' : 's'
      } recently`,
    );
  }

  if (mastery.correctStreak > 0) {
    reasons.push(
      `${mastery.correctStreak} correct attempt${
        mastery.correctStreak === 1 ? '' : 's'
      } streak`,
    );
  }

  return {
    conceptId,
    bucket: mastery.bucket,
    score: mastery.score,
    lastStudiedAt: mastery.lastStudiedAt,
    nextReviewAt: mastery.nextReviewAt,
    reviewInterval: mastery.reviewInterval,
    reason: reasons.join(' + '),
  };
}
}