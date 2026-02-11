import { Controller, Get, Query } from '@nestjs/common';
import { BalancesService } from './balances.service';

@Controller('balances')
export class BalancesController {
    constructor(private readonly balancesService: BalancesService) { }

    @Get()
    async findAll(@Query('userId') userId: string, @Query('symbol') symbol?: string, @Query('isDemo') isDemo?: string) {
        const isDemoBool = isDemo === 'true';
        if (symbol) {
            return this.balancesService.getBalance(userId, symbol, isDemoBool);
        }
        return this.balancesService.getAllBalances(userId, isDemoBool);
    }
}
