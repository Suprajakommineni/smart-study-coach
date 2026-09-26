import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConceptService } from './concept.service.js';

@Controller('sources/:sourceId/concepts')
@UseGuards(AuthGuard('jwt'))
export class ConceptController {
  constructor(private conceptService: ConceptService) {}

  @Get()
  async findAllConcepts(
    @Param('sourceId') sourceId: string,
    @Request() req: any,
  ) {
    return this.conceptService.findAllConcepts(
      Number(sourceId),
      req.user.userId,
    );
  }
}
