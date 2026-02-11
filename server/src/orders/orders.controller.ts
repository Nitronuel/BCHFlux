import { Controller, Post, Body, Get, Delete, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // TODO: Secure with AuthGuard to extract userId from JWT
    @Post()
    create(@Body() createOrderDto: CreateOrderDto, @Body('userId') userId: string) {
        if (!userId) {
            // Fallback for testing or throw error
            // throw new BadRequestException('User ID required');
        }
        return this.ordersService.createOrder(userId, createOrderDto);
    }

    @Get()
    findAll(@Query('userId') userId: string) {
        return this.ordersService.getOpenOrders(userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('userId') userId: string) {
        return this.ordersService.cancelOrder(userId, id);
    }
}
