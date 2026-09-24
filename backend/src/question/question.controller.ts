import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionService } from './question.service.js';

@Controller('modules/:moduleId/questions')
@UseGuards(AuthGuard('jwt'))
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  @Post('generate')
  async generate(@Param('moduleId') moduleId: string) {
    return this.questionService.generateQuestions(Number(moduleId));
  }

  @Get()
  async findAll(@Param('moduleId') moduleId: string) {
    return this.questionService.findAllForModule(Number(moduleId));
  }
}