import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudySessionService } from './study-session.service.js';

@Controller('study-sessions')
@UseGuards(AuthGuard('jwt'))
export class StudySessionController {
  constructor(private studySessionService: StudySessionService) {}

  @Post('start')
  async start(
    @Req() req: any,
    @Body() body: { moduleId: number; questionCount: number },
  ) {
    return this.studySessionService.startSession(
      req.user.userId,
      body.moduleId,
      body.questionCount,
    );
  }

  @Post(':id/attempt')
async submitAttempt(
  @Param('id') id: string,
  @Body()
  body: {
    questionId: number;
    answer: string;
    timeTaken?: number;
  },
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
  @Get(':id/results')
async getResults(
  @Param('id') id: string,
  @Request() req: any,
) {
  return this.studySessionService.getSessionResults(
    Number(id),
    req.user.userId,
  );
}

 @Post('attempts/:attemptId/override')
async overrideAttempt(
  @Param('attemptId') attemptId: string,
  @Body()
  body: {
    result: string;
    reason?: string;
  },
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