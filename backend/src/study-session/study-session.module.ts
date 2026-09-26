import { Module } from '@nestjs/common';
import { StudySessionController } from './study-session.controller.js';
import { StudySessionService } from './study-session.service.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [MasteryModule, AuditLogModule, PrismaModule],
  controllers: [StudySessionController],
  providers: [StudySessionService],
})
export class StudySessionModule {}