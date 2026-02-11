import { Module } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { AuthModule } from '../auth/auth.module';
import { BalancesController } from './balances.controller';

@Module({
    imports: [AuthModule],
    controllers: [BalancesController],
    providers: [BalancesService],
    exports: [BalancesService],
})
export class BalancesModule { }
