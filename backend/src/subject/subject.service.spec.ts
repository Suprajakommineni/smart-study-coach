import { Test, TestingModule } from '@nestjs/testing';
import { SubjectService } from './subject.service.js';

describe('SubjectService', () => {
  let service: SubjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubjectService],
    }).compile();

    service = module.get<SubjectService>(SubjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
