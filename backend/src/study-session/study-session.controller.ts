import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudySessionService } from './study-session.service.js';
@Controller('study-sessions')
@UseGuards(AuthGuard('jwt'))
export class StudySessionController {
  constructor(private studySessionService: StudySessionService) {}
  @Post('start') async start(
    @Request() req: any,
    @Body()
    body: {
      moduleId: number;
      questionCount: number;
      questionTypes?: ('mcq' | 'true_false' | 'short_answer')[];
    },
  ) {
    return this.studySessionService.startSession(
      body.moduleId,
      req.user.userId,
      body.questionCount,
      body.questionTypes,
    );
  }
  @Post(':id/attempt') async submitAttempt(
    @Param('id') id: string,
    @Body() body: { questionId: number; answer: string; timeTaken?: number },
    @Request() req: any,
  ) {
    return this.studySessionService.submitAttempt(
      Number(id),
      req.user.userId,
      body.questionId,
      body.answer,
      body.timeTaken,
    );
  }
  @Get(':id/results') async getResults(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.studySessionService.getResults(Number(id), req.user.userId);
  }
  @Post('attempts/:attemptId/override') async overrideAttempt(
    @Param('attemptId') attemptId: string,
    @Body()
    body: { result: 'correct' | 'incorrect' | 'partial'; reason?: string },
    @Request() req: any,
  ) {
    return this.studySessionService.overrideAttempt(
      Number(attemptId),
      req.user.userId,
      body.result,
      body.reason,
    );
  }
}
