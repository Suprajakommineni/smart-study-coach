import { Module } from '@nestjs/common';
import { QuestionService } from './question.service.js';
import { QuestionController } from './question.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
   imports: [AuditLogModule],
  controllers: [QuestionController],
  providers: [QuestionService, PrismaService],
})
export class QuestionModule {}