import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SearchController } from './search.controller.js';

@Module({
  providers: [SearchService, PrismaService],
  exports: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}