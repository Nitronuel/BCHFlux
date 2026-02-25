import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { FuturesService } from './futures.service';

@Controller('futures')
export class FuturesController {
    constructor(private readonly futuresService: FuturesService) { }

    @Get('positions')
    getOpenPositions(@Query('userId') userId: string, @Query('isDemo') isDemo: string) {
        if (!userId) throw new BadRequestException('User ID required');
        const demo = isDemo === 'true';
        return this.futuresService.getOpenPositions(userId, demo);
    }

    @Post('close')
    closePosition(@Body() payload: { userId: string, positionId: string }) {
        if (!payload.userId || !payload.positionId) throw new BadRequestException('userId and positionId required');
        return this.futuresService.closePosition(payload.userId, payload.positionId);
    }
}
