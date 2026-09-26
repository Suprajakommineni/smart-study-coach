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
import { QuestionModule } from './question/question.module.js';
import { StudySessionModule } from './study-session/study-session.module.js';
import { MasteryModule } from './mastery/mastery.module.js';
import { AuditLogModule } from './audit-log/audit-log.module.js';
import { SearchService } from './search/search.service.js';
import { SearchModule } from './search/search.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [PrismaModule, AuthModule, WorkspaceModule, SubjectModule, ModuleModule, SourceModule, ConceptModule, QuestionModule, StudySessionModule, MasteryModule, AuditLogModule, SearchModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, SearchService ],
})
export class AppModule {}
