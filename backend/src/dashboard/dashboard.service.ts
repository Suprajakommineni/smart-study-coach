import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardForUser(userId: number) {
    const concepts = await this.prisma.concept.findMany({
      where: {
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
      include: {
        mastery: true,
        source: {
          include: {
            module: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });

    const attempts = await this.prisma.attempt.findMany({
      where: {
        studySession: {
          userId,
        },
      },
      include: {
        question: {
          include: {
            concepts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const masteryDistribution = {
      New: 0,
      Learning: 0,
      Proficient: 0,
      Mastered: 0,
    };

    for (const concept of concepts) {
      const bucket = concept.mastery?.bucket;

      if (
        bucket === 'New' ||
        bucket === 'Learning' ||
        bucket === 'Proficient' ||
        bucket === 'Mastered'
      ) {
        masteryDistribution[bucket]++;
      }
    }

    const totalMastery = concepts.reduce(
      (sum, concept) => sum + (concept.mastery?.score ?? 0),
      0,
    );

    const averageMastery =
      concepts.length > 0 ? Math.round(totalMastery / concepts.length) : 0;

    const correctAttempts = attempts.filter(
      (attempt) => attempt.result === 'correct',
    ).length;

    const accuracy =
      attempts.length > 0
        ? Math.round((correctAttempts / attempts.length) * 100)
        : 0;

    const now = new Date();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentAttempts = attempts.filter(
      (attempt) => attempt.createdAt >= sevenDaysAgo,
    );

    const accuracyTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo);

      date.setDate(sevenDaysAgo.getDate() + index);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const dayAttempts = recentAttempts.filter(
        (attempt) => attempt.createdAt >= date && attempt.createdAt < nextDate,
      );

      const dayCorrect = dayAttempts.filter(
        (attempt) => attempt.result === 'correct',
      ).length;

      return {
        date: date.toISOString().split('T')[0],
        accuracy:
          dayAttempts.length > 0
            ? Math.round((dayCorrect / dayAttempts.length) * 100)
            : 0,
        attempts: dayAttempts.length,
      };
    });

    const weakConcepts = concepts
      .map((concept) => ({
        conceptId: concept.id,
        title: concept.title,
        score: Math.round(concept.mastery?.score ?? 0),
        bucket: concept.mastery?.bucket ?? 'New',
        module: {
          id: concept.source.module.id,
          name: concept.source.module.name,
        },
        subject: {
          id: concept.source.module.subject.id,
          name: concept.source.module.subject.name,
        },
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    return {
      summary: {
        totalConcepts: concepts.length,
        averageMastery,
        totalAttempts: attempts.length,
        accuracy,
      },

      masteryDistribution,

      accuracyTrend,

      weakConcepts,
    };
  }
}
