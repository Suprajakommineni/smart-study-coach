import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MasteryService } from './mastery.service.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('mastery')
export class MasteryController {
  constructor(private readonly masteryService: MasteryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getMyMastery(@Req() req: any) {
    return this.masteryService.getMasteryForUser(req.user.userId);
  }
}
