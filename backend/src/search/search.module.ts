import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SearchController } from './search.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [SearchService],
  exports: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}