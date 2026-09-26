import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service.js';

@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  search(@Query('q') query: string, @Request() req: any) {
    return this.searchService.search(query, req.user.userId);
  }
}
