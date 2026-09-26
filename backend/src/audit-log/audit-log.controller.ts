import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogService } from './audit-log.service.js';

@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getMyAuditLogs(@Req() req: any) {
    return this.auditLogService.getLogsForUser(req.user.userId);
  }
}
