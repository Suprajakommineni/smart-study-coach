import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller.js';
import { ModuleService } from './module.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleController],
  providers: [ModuleService]
})
export class ModuleModule {}
