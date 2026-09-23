import { Controller, Get, Param, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConceptService } from './concept.service.js';

@Controller('sources/:sourceId/concepts')
@UseGuards(AuthGuard('jwt'))
export class ConceptController {
  constructor(private conceptService: ConceptService) {}

  @Get()
  async findAllConcepts(@Param('sourceId') sourceId: string) {
    return this.conceptService.findAllConcepts(Number(sourceId));
  }
  
  
}
