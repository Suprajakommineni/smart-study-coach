import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service.js';
import { WorkspaceController } from './workspace.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [WorkspaceService],
  controllers: [WorkspaceController]
})
export class WorkspaceModule {}
