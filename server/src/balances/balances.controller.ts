import { Controller, Get, Post, Query, Body } from '@nestjs/common';
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
    }

    @Post('sync')
    async sync(@Body('userId') userId: string, @Body('symbol') symbol: string, @Body('amount') amount: number) {
        if (!userId || !symbol || amount === undefined) {
            return { error: 'Missing required fields' };
        }
        return this.balancesService.syncBalance(userId, symbol, amount, false);
    }
}
