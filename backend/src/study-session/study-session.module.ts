import { Module } from '@nestjs/common';
import { StudySessionService } from './study-session.service.js';
import { StudySessionController } from './study-session.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [StudySessionController],
  providers: [StudySessionService, PrismaService],
})
export class StudySessionModule {}