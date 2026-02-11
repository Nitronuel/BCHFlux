import { IsString, IsNumber, IsIn, IsPositive, IsOptional, IsBoolean } from 'class-validator';

export class CreateOrderDto {
    @IsString()
    symbol: string;

    @IsString()
    @IsIn(['buy', 'sell'])
    side: 'buy' | 'sell';

    @IsString()
    @IsIn(['limit', 'market'])
    type: 'limit' | 'market';

    @IsString()
    @IsIn(['spot', 'futures'])
    @IsOptional()
    variant?: 'spot' | 'futures' = 'spot';

    @IsNumber()
    @IsOptional() // Optional for market orders? No, limit needs price.
    price?: number;

    @IsNumber()
    @IsPositive()
    amount: number;

    @IsNumber()
    @IsOptional()
    leverage?: number;

    @IsString()
    @IsOptional()
    chainId?: string;

    @IsString()
    @IsOptional()
    pairAddress?: string;

    @IsBoolean()
    @IsOptional()
    isDemo?: boolean = false;
}
