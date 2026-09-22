import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service.js';
import { WorkspaceController } from './workspace.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  providers: [WorkspaceService, PrismaService],
  controllers: [WorkspaceController]
})
export class WorkspaceModule {}
