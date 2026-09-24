import { Module } from '@nestjs/common';
import { QuestionService } from './question.service.js';
import { QuestionController } from './question.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [QuestionController],
  providers: [QuestionService, PrismaService],
})
export class QuestionModule {}