import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async createLog(
    userId: number | null,
    action: string,
    entityType: string,
    entityId: number,
    beforeData?: unknown,
    afterData?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        beforeData: beforeData
          ? JSON.stringify(beforeData)
          : null,
        afterData: afterData
          ? JSON.stringify(afterData)
          : null,
      },
    });
  }

  async findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}