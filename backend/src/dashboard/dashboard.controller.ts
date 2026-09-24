import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service.js';

@Controller('modules/:moduleId/dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
getDashboard(
  @Param('moduleId') moduleId: string,
  @Request() req: any,
) {
  return this.dashboardService.getModuleDashboard(
    Number(moduleId),
    req.user.userId,
  );
}
}