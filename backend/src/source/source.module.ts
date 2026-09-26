import { Module } from '@nestjs/common';
import { SourceService } from './source.service.js';
import { SourceController } from './source.controller.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';


@Module({
  imports: [AuditLogModule, PrismaModule],
  providers: [SourceService],
  controllers: [SourceController]
})
export class SourceModule {}
