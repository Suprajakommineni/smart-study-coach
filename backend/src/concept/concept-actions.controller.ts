import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConceptService } from './concept.service.js';

@Controller('concepts')
@UseGuards(AuthGuard('jwt'))
export class ConceptActionsController {
  constructor(private conceptService: ConceptService) {}

  @Post(':id/accept')
  async accept(@Param('id') id: string) {
    return this.conceptService.accept(Number(id));
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return this.conceptService.reject(Number(id));
  }

  @Patch(':id/edit')
  async edit(
    @Param('id') id: string,
    @Body() body: { title: string; definition: string; facts: string[] },
  ) {
    return this.conceptService.edit(Number(id), body.title, body.definition, body.facts);
  }

  @Post('merge')
  async merge(@Body() body: { keepId: number; mergeId: number }) {
    return this.conceptService.merge(body.keepId, body.mergeId);
  }
}