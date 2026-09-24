import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudySessionService } from './study-session.service.js';

@Controller('study-sessions')
@UseGuards(AuthGuard('jwt'))
export class StudySessionController {
  constructor(private studySessionService: StudySessionService) {}

  @Post('start')
  async start(@Body() body: { moduleId: number; questionCount: number }) {
    return this.studySessionService.startSession(body.moduleId, body.questionCount);
  }

  @Post(':id/attempt')
  async submitAttempt(
    @Param('id') id: string,
    @Body() body: { questionId: number; answer: string; timeTaken?: number },
  ) {
    return this.studySessionService.submitAttempt(
      Number(id),
      body.questionId,
      body.answer,
      body.timeTaken,
    );
  }

  @Get(':id/results')
  async getResults(@Param('id') id: string) {
    return this.studySessionService.getSessionResults(id ? Number(id) : 0);
  }
}