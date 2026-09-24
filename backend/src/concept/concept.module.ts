import { Module } from '@nestjs/common';
import { ConceptService } from './concept.service.js';
import { ConceptController } from './concept.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConceptActionsController } from './concept-actions.controller.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { MasteryModule } from '../mastery/mastery.module.js';

@Module({
  imports: [AuditLogModule,MasteryModule],
  providers: [ConceptService, PrismaService],
  controllers: [ConceptController, ConceptActionsController],
})
export class ConceptModule {}