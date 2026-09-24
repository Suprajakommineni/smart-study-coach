import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getModuleDashboard(moduleId: number, userId: number) {
    // Check that the module belongs to the logged-in user
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

    // Get mastery records for active concepts in this module
    const masteryRecords = await this.prisma.mastery.findMany({
      where: {
        concept: {
          source: {
            moduleId,
          },
          status: {
            notIn: ['rejected', 'merged', 'outdated'],
          },
        },
      },
      include: {
        concept: true,
      },
    });

    // Mastery distribution
    const masteryDistribution = {
      New: 0,
      Learning: 0,
      Proficient: 0,
      Mastered: 0,
    };

    for (const mastery of masteryRecords) {
      if (mastery.bucket in masteryDistribution) {
        masteryDistribution[
          mastery.bucket as keyof typeof masteryDistribution
        ]++;
      }
    }

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get attempts from the last 7 days
    const attempts = await this.prisma.attempt.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        question: {
          status: {
            not: 'retired',
          },
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
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Overall 7-day accuracy
    const totalAttempts = attempts.length;

    const correctAttempts = attempts.filter(
      attempt => attempt.result === 'correct',
    ).length;

    const accuracy =
      totalAttempts > 0
        ? Math.round((correctAttempts / totalAttempts) * 100)
        : 0;

    // 7-day accuracy trend
    const accuracyTrend: {
      date: string;
      accuracy: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(date.getDate() - i);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAttempts = attempts.filter(
        attempt =>
          attempt.createdAt >= dayStart &&
          attempt.createdAt <= dayEnd,
      );

      const dayCorrect = dayAttempts.filter(
        attempt => attempt.result === 'correct',
      ).length;

      const dayAccuracy =
        dayAttempts.length > 0
          ? Math.round((dayCorrect / dayAttempts.length) * 100)
          : 0;

      accuracyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        accuracy: dayAccuracy,
      });
    }

    // Top 5 weak concepts
    const weakConcepts = masteryRecords
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(mastery => ({
        conceptId: mastery.conceptId,
        title: mastery.concept.title,
        score: Math.round(mastery.score),
        bucket: mastery.bucket,
      }));

    return {
      moduleId,
      masteryDistribution,
      accuracy,
      totalAttempts,
      accuracyTrend,
      weakConcepts,
    };
  }
}