import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
  exports: [DashboardService],
})
export class DashboardModule {}