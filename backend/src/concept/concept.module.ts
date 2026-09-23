import { Module } from '@nestjs/common';
import { ConceptService } from './concept.service.js';
import { ConceptController } from './concept.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConceptActionsController } from './concept-actions.controller.js';

@Module({
  providers: [ConceptService, PrismaService],
  controllers: [ConceptController, ConceptActionsController]
})
export class ConceptModule {}
