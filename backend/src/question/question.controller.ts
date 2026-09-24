import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionService } from './question.service.js';

@Controller('modules/:moduleId/questions')
@UseGuards(AuthGuard('jwt'))
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  @Post('generate')
  async generate(
    @Param('moduleId') moduleId: string,
    @Request() req: any,
  ) {
    return this.questionService.generateQuestions(
      Number(moduleId),
      req.user.userId,
    );
  }

  @Get()
async findAll(
  @Param('moduleId') moduleId: string,
  @Request() req: any,
) {
  return this.questionService.findAllForModule(
    Number(moduleId),
    req.user.userId,
  );
}
}