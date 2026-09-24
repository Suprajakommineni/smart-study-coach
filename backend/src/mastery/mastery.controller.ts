import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MasteryService } from './mastery.service.js';

@Controller('mastery')
@UseGuards(AuthGuard('jwt'))
export class MasteryController {
  constructor(private masteryService: MasteryService) {}

  @Get(':conceptId/due-reason')
  getDueReason(@Param('conceptId') conceptId: string) {
    return this.masteryService.getDueReason(Number(conceptId));
  }
}