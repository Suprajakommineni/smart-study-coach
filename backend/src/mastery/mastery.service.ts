import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MasteryService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // RECENCY WEIGHT
  // =========================================================

  private getRecencyWeight(createdAt: Date): number {
    const now = new Date();

    const ageInDays =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays <= 1) return 1.0;
    if (ageInDays <= 7) return 0.8;
    if (ageInDays <= 30) return 0.5;

    return 0.3;
  }

  // =========================================================
  // MASTERY BUCKET
  // =========================================================

  private getBucket(score: number): string {
    if (score < 25) return 'New';
    if (score < 50) return 'Learning';
    if (score < 75) return 'Proficient';

    return 'Mastered';
  }

  // =========================================================
  // REVIEW INTERVAL
  // =========================================================

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

  // =========================================================
  // GET ALL MASTERY FOR LOGGED-IN USER
  // =========================================================

  async getMasteryForUser(userId: number) {
    const mastery = await this.prisma.mastery.findMany({
      where: {
        concept: {
          status: 'accepted',

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

      include: {
        concept: {
          select: {
            id: true,
            title: true,
            definition: true,
            tags: true,

            source: {
              select: {
                id: true,
                module: {
                  select: {
                    id: true,
                    name: true,

                    subject: {
                      select: {
                        id: true,
                        name: true,

                        workspace: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        score: 'asc',
      },
    });

    return mastery.map((item) => ({
      conceptId: item.conceptId,

      conceptTitle: item.concept.title,

      definition: item.concept.definition,

      tags: item.concept.tags,

      score: Math.round(item.score),

      bucket: item.bucket,

      lastStudiedAt: item.lastStudiedAt,

      nextReviewAt: item.nextReviewAt,

      reviewInterval: item.reviewInterval,

      correctStreak: item.correctStreak,

      incorrectStreak: item.incorrectStreak,

      module: {
        id: item.concept.source.module.id,
        name: item.concept.source.module.name,
      },

      subject: {
        id: item.concept.source.module.subject.id,
        name: item.concept.source.module.subject.name,
      },

      workspace: {
        id: item.concept.source.module.subject.workspace.id,
        name: item.concept.source.module.subject.workspace.name,
      },
    }));
  }

  // =========================================================
  // RECALCULATE MASTERY
  // Works inside a transaction (pass tx) or on its own.
  // =========================================================

  async recalculateMastery(conceptId: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    const attempts = await db.attempt.findMany({
      where: {
        question: {
          concepts: {
            some: { conceptId },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let score = 0;
    let correctStreak = 0;
    let incorrectStreak = 0;

    for (const attempt of attempts) {
      const result = attempt.userOverride || attempt.result;
      const weight = this.getRecencyWeight(attempt.createdAt);

      if (result === 'correct') {
        score += 10 * weight;
        correctStreak += 1;
        incorrectStreak = 0;
      } else if (result === 'partial') {
        score += 5 * weight;
        correctStreak = 0;
        incorrectStreak = 0;
      } else {
        score -= 15 * weight;
        incorrectStreak += 1;
        correctStreak = 0;
      }

      score = Math.max(0, Math.min(100, score));
    }

    const bucket = this.getBucket(score);

    const reviewInterval = this.getReviewInterval(
      score,
      correctStreak,
      incorrectStreak,
    );

    const lastAttempt = attempts[attempts.length - 1];
    const lastStudiedAt = lastAttempt?.createdAt ?? null;

    const nextReviewAt = lastStudiedAt
      ? new Date(lastStudiedAt.getTime() + reviewInterval * 24 * 60 * 60 * 1000)
      : null;

    return db.mastery.upsert({
      where: { conceptId },
      create: {
        conceptId,
        score,
        bucket,
        correctStreak,
        incorrectStreak,
        reviewInterval,
        lastStudiedAt,
        nextReviewAt,
      },
      update: {
        score,
        bucket,
        correctStreak,
        incorrectStreak,
        reviewInterval,
        lastStudiedAt,
        nextReviewAt,
      },
    });
  }

  // =========================================================
  // WHY IS THIS DUE?
  // =========================================================

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

    reasons.push(`mastery ${Math.round(mastery.score)}`);

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