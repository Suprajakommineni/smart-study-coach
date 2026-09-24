import { Test, TestingModule } from '@nestjs/testing';
import { MasteryService } from './mastery.service.js';

describe('MasteryService', () => {
  let service: MasteryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasteryService],
    }).compile();

    service = module.get<MasteryService>(MasteryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
