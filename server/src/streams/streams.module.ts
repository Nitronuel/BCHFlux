
import { Module } from '@nestjs/common';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';
import { AuthModule } from '../auth/auth.module';
import { BalancesModule } from '../balances/balances.module';

@Module({
    imports: [AuthModule, BalancesModule],
    controllers: [StreamsController],
    providers: [StreamsService],
})
export class StreamsModule { }
