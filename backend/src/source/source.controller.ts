import { Controller, UseGuards, Post, Body, Param, Get, Patch, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SourceService } from './source.service.js';

@Controller('modules/:moduleId/sources')
@UseGuards(AuthGuard('jwt'))
export class SourceController {
    constructor(private sourceService: SourceService) {}

    @Post()
    async create(@Param('moduleId') moduleId: string, @Body('text') text: string ) {
        return this.sourceService.create(Number(moduleId), text)
    }
    @Patch(':sourceId')
async update(
  @Param('sourceId') sourceId: string,
  @Body('text') text: string,
  @Request() req: any,
) {
  return this.sourceService.update(
    Number(sourceId),
    req.user.userId,
    text,
  );
}

    @Get()
    async findAll(@Param('moduleId') moduleId: string) {
        return this.sourceService.findAllForModule(Number(moduleId))
    }

    @Post(':sourceId/process')
    async process(@Param('sourceId') sourceId: string) {
        return this.sourceService.process(Number(sourceId))
    }
}
