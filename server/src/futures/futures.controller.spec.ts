import { Test, TestingModule } from '@nestjs/testing';
import { FuturesController } from './futures.controller';

describe('FuturesController', () => {
  let controller: FuturesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FuturesController],
    }).compile();

    controller = module.get<FuturesController>(FuturesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
