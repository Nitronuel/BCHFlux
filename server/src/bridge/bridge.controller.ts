import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BridgeService } from './bridge.service';

@Controller('bridge')
export class BridgeController {
    constructor(private readonly bridgeService: BridgeService) { }

    @Post('quote')
    async getQuote(@Body() body: { amount: number; toToken: string; toChain: string }) {
        return this.bridgeService.getQuote(body.amount, body.toToken, body.toChain);
    }

    @Get('status/:txId')
    async getStatus(@Param('txId') txId: string) {
        return this.bridgeService.getStatus(txId);
    }
}
