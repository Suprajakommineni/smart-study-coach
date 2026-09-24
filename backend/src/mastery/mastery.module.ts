import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { MasteryController } from './mastery.controller.js';
import { MasteryService } from './mastery.service.js';
import { PrismaService } from '../prisma/prisma.service.js';


@Module({
  imports: [AuditLogModule],
  controllers: [MasteryController],
  providers: [MasteryService, PrismaService],
  exports: [MasteryService],
})
export class MasteryModule {}