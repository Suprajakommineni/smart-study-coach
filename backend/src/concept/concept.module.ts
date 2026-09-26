import { Module } from '@nestjs/common';
import { ConceptService } from './concept.service.js';
import { ConceptController } from './concept.controller.js';
import { ConceptActionsController } from './concept-actions.controller.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [AuditLogModule,MasteryModule, PrismaModule],
  providers: [ConceptService],
  controllers: [ConceptController, ConceptActionsController],
})
export class ConceptModule {}