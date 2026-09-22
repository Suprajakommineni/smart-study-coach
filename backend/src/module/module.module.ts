import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller.js';
import { ModuleService } from './module.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [ModuleController],
  providers: [ModuleService, PrismaService]
})
export class ModuleModule {}
