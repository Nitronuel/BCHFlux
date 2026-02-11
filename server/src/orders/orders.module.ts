import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BalancesModule } from '../balances/balances.module';
import { AuthModule } from '../auth/auth.module';
import { ProxyModule } from '../proxy/proxy.module'; // Added import

@Module({
    imports: [BalancesModule, AuthModule, ProxyModule],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule { }
