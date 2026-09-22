import { Body, Controller, Param, Post, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubjectService } from './subject.service.js';

@Controller('workspaces/:workspaceId/subjects')
@UseGuards(AuthGuard('jwt'))
export class SubjectController {
    constructor( private subjectService: SubjectService) {}

    @Post()
    async create(@Param('workspaceId') workspaceId: string, @Body('name') name: string, @Body('description') description?: string, @Body('tags') tags?: string) {
        return this.subjectService.create(Number(workspaceId), name, description, tags )
    }

    @Get()
    async findAll(@Param('workspaceId') workspaceId: string) {
        return this.subjectService.findAllForWorkSpace(Number(workspaceId));
    }
}
