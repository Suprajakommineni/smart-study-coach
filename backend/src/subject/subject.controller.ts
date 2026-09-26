import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubjectService } from './subject.service.js';

@Controller('workspaces/:workspaceId/subjects')
@UseGuards(AuthGuard('jwt'))
export class SubjectController {
  constructor(private subjectService: SubjectService) {}

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body('name') name: string,
    @Body('description') description: string | undefined,
    @Body('tags') tags: string | undefined,
    @Request() req: any,
  ) {
    return this.subjectService.create(
      Number(workspaceId),
      req.user.userId,
      name,
      description,
      tags,
    );
  }

  @Get()
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.subjectService.findAllForWorkSpace(
      Number(workspaceId),
      req.user.userId,
    );
  }
}
