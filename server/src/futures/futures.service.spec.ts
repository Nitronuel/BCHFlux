import { Test, TestingModule } from '@nestjs/testing';
import { FuturesService } from './futures.service';

describe('FuturesService', () => {
  let service: FuturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FuturesService],
    }).compile();

    service = module.get<FuturesService>(FuturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
