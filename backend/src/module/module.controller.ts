import { Body, Controller, Post, Param, Get, UseGuards } from '@nestjs/common';
import { ModuleService } from './module.service.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('workspaces/:workspaceId/subjects/:subjectId/modules')
@UseGuards(AuthGuard('jwt'))
export class ModuleController {
    constructor( private moduleService: ModuleService) {}

    @Post()
    async create(@Param('subjectId') subjectId: string, @Body('name') name: string, @Body('description') description?: string, @Body('tags') tags?: string) {
        return this.moduleService.create(Number(subjectId), name, description, tags);
    }
    @Get()
    async findAllForSubject(@Param('subjectId') subjectId: string) {
        return this.moduleService.findAllForSubject(Number(subjectId));
    }
}
