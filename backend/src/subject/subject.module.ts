import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service.js';
import { SubjectController } from './subject.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  providers: [SubjectService, PrismaService],
  controllers: [SubjectController]
})
export class SubjectModule {}
