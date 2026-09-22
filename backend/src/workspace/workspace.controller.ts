import { Controller, Request, Body, Post, Get, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspace.service.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('workspaces')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceController {
    constructor(private workspaceService: WorkspaceService) {}
    @Post()
    async create(@Request() req: any, @Body('name') name: string, @Body('description') description?: string, @Body('tags') tags?: string) {
        return this.workspaceService.create(req.user.userId, name, description, tags)
    }
    @Get()
    async findAll(@Request() req: any) {
        return this.workspaceService.findAllForUser(req.user.userId)
    }
}
