import {
  Body,
  Controller,
  Post,
  Param,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ModuleService } from './module.service.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('workspaces/:workspaceId/subjects/:subjectId/modules')
@UseGuards(AuthGuard('jwt'))
export class ModuleController {
  constructor(private moduleService: ModuleService) {}

  @Post()
  async create(
    @Param('subjectId') subjectId: string,
    @Body('name') name: string,
    @Body('description') description: string | undefined,
    @Body('tags') tags: string | undefined,
    @Request() req: any,
  ) {
    return this.moduleService.create(
      Number(subjectId),
      req.user.userId,
      name,
      description,
      tags,
    );
  }

  @Get()
  async findAllForSubject(
    @Param('subjectId') subjectId: string,
    @Request() req: any,
  ) {
    return this.moduleService.findAllForSubject(
      Number(subjectId),
      req.user.userId,
    );
  }
}
