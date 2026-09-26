import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service.js';
import { SubjectController } from './subject.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [SubjectService],
  controllers: [SubjectController]
})
export class SubjectModule {}
