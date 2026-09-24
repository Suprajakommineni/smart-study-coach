import { Module } from '@nestjs/common';
import { SourceService } from './source.service.js';
import { SourceController } from './source.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';


@Module({
  imports: [AuditLogModule],
  providers: [SourceService, PrismaService],
  controllers: [SourceController]
})
export class SourceModule {}
