import { Module } from '@nestjs/common';
import { FuturesService } from './futures.service';
import { FuturesController } from './futures.controller';
import { AuthModule } from '../auth/auth.module';
import { BalancesModule } from '../balances/balances.module';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
  imports: [AuthModule, BalancesModule, ProxyModule],
  providers: [FuturesService],
  controllers: [FuturesController]
})
export class FuturesModule { }
