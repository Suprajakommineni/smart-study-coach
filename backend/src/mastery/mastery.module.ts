import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { MasteryController } from './mastery.controller.js';
import { MasteryService } from './mastery.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';


@Module({
  imports: [AuditLogModule, PrismaModule],
  controllers: [MasteryController],
  providers: [MasteryService],
  exports: [MasteryService],
})
export class MasteryModule {}