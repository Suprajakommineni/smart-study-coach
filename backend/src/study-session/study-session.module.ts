import { Module } from '@nestjs/common';
import { StudySessionController } from './study-session.controller.js';
import { StudySessionService } from './study-session.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [MasteryModule, AuditLogModule],
  controllers: [StudySessionController],
  providers: [StudySessionService, PrismaService],
})
export class StudySessionModule {}