import { Module } from '@nestjs/common';
import { QuestionService } from './question.service.js';
import { QuestionController } from './question.controller.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
   imports: [AuditLogModule, PrismaModule],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule {}