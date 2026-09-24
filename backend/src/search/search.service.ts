import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, userId: number) {
    const searchText = query.trim();

    if (!searchText) {
      return {
        concepts: [],
        questions: [],
      };
    }

    const concepts = await this.prisma.concept.findMany({
      where: {
        status: {
          notIn: ['rejected', 'merged', 'outdated'],
        },
        source: {
          module: {
            subject: {
              workspace: {
                userId,
              },
            },
          },
        },
        OR: [
          {
            title: {
              contains: searchText,
            },
          },
          {
            definition: {
              contains: searchText,
            },
          },
          {
            tags: {
              contains: searchText,
            },
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const questions = await this.prisma.question.findMany({
      where: {
        status: {
          not: 'retired',
        },
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
        OR: [
          {
            text: {
              contains: searchText,
            },
          },
          {
            answer: {
              contains: searchText,
            },
          },
        ],
      },
      include: {
        concepts: {
          include: {
            concept: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      concepts,
      questions,
    };
  }
}