
import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { StreamsService, CreateStreamDto } from './streams.service';

@Controller('streams')
export class StreamsController {
    constructor(private readonly streamsService: StreamsService) { }

    @Post('create')
    async createStream(@Body() body: { userId: string; data: CreateStreamDto; isDemo?: boolean }) {
        return this.streamsService.createStream(body.userId, body.data, body.isDemo);
    }

    @Get('employer/:userId')
    async getEmployerStreams(@Param('userId') userId: string) {
        return this.streamsService.getStreamsByEmployer(userId);
    }

    @Get('recipient/:address')
    async getRecipientStreams(@Param('address') address: string) {
        return this.streamsService.getStreamsByRecipient(address);
    }

    @Post('withdraw')
    async withdraw(@Body() body: { recipientId: string; amount?: number }) {
        return this.streamsService.withdraw(body.recipientId, body.amount);
    }
}
