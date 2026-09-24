import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller.js';
import { AuditLogService } from './audit-log.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, PrismaService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
