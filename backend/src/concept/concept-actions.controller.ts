import { Controller, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConceptService } from './concept.service.js';

@Controller('concepts')
@UseGuards(AuthGuard('jwt'))
export class ConceptActionsController {
  constructor(private conceptService: ConceptService) {}

  @Post(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.conceptService.accept(Number(id), req.user.userId);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Request() req: any) {
    return this.conceptService.reject(Number(id), req.user.userId);
  }

  @Patch(':id/edit')
  async edit(
    @Param('id') id: string,
    @Body() body: { title: string; definition: string; facts: string[] }, @Request() req: any
  ) {
    return this.conceptService.edit(Number(id), req.user.userId, body.title, body.definition, body.facts);
  }

  @Post('merge')
  async merge(@Body() body: { keepId: number; mergeId: number} , @Request() req: any ) {
    return this.conceptService.merge(body.keepId, body.mergeId,req.user.userId);
  }
}