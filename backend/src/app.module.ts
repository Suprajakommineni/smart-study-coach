import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { WorkspaceModule } from './workspace/workspace.module.js';
import { SubjectModule } from './subject/subject.module.js';
import { ModuleModule } from './module/module.module.js';
import { SourceModule } from './source/source.module.js';
import { ConceptModule } from './concept/concept.module.js';

@Module({
  imports: [AuthModule, WorkspaceModule, SubjectModule, ModuleModule, SourceModule, ConceptModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
