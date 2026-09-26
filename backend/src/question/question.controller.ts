import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { QuestionService } from './question.service.js';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  @Post('modules/:moduleId/questions/generate')
  async generate(@Param('moduleId') moduleId: string, @Request() req: any) {
    return this.questionService.generateQuestions(
      Number(moduleId),
      req.user.userId,
    );
  }

  @Get('modules/:moduleId/questions')
  async findAll(@Param('moduleId') moduleId: string, @Request() req: any) {
    return this.questionService.findAllForModule(
      Number(moduleId),
      req.user.userId,
    );
  }

  @Post('questions/:questionId/edit')
  async editQuestion(
    @Param('questionId') questionId: string,
    @Body()
    body: {
      text: string;
      answer: string;
      choices: string[] | null;
      difficulty: number;
      conceptIds: number[];
    },
    @Request() req: any,
  ) {
    return this.questionService.editQuestion(
      Number(questionId),
      req.user.userId,
      body,
    );
  }

  @Post('questions/:questionId/approve')
  async approveQuestion(
    @Param('questionId') questionId: string,
    @Request() req: any,
  ) {
    return this.questionService.approveQuestion(
      Number(questionId),
      req.user.userId,
    );
  }

  @Post('questions/:questionId/retire')
  async retireQuestion(
    @Param('questionId') questionId: string,
    @Request() req: any,
  ) {
    return this.questionService.retireQuestion(
      Number(questionId),
      req.user.userId,
    );
  }
}
