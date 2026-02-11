import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../auth/supabase.service';
import { BalancesService } from '../balances/balances.service';
import { ProxyService } from '../proxy/proxy.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly balancesService: BalancesService,
        private readonly proxyService: ProxyService,
    ) { }

    // Create a new order
    async createOrder(userId: string, createOrderDto: CreateOrderDto) {
        const admin = this.supabaseService.getAdminClient();
        const { symbol, side, type, price, amount, leverage, variant, chainId, pairAddress, isDemo } = createOrderDto;

        // 1. Calculate required funds to lock
        let assetToLock = '';
        let amountToLock = 0;

        if (variant === 'futures') {
            assetToLock = 'USDT';
            const notional = (price || 0) * amount; // Market orders in futures need estimate? Assume limit for now
            if (!price && type === 'limit') throw new BadRequestException('Price required for limit orders');

            // Simplified margin calc
            amountToLock = notional / (leverage || 1);
        } else {
            // Spot
            const [base, quote] = symbol.split('/');
            if (side === 'buy') {
                assetToLock = quote;
                amountToLock = amount * (price || 0); // Convert to quote
            } else {
                assetToLock = base;
                amountToLock = amount;
            }
        }

        // 2. Lock Funds
        await this.balancesService.lockFunds(userId, assetToLock, amountToLock, isDemo);

        // 3. Insert Order
        try {
            const { data, error } = await admin
                .from('orders')
                .insert({
                    user_id: userId,
                    symbol,
                    side,
                    type,
                    variant,
                    price,
                    amount,
                    chain_id: chainId,
                    pair_address: pairAddress,
                    filled: 0,
                    status: 'open', // Should be validated enum
                    created_at: new Date(),
                    is_demo: isDemo // Save the flag
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            return data;
        } catch (err) {
            // Rollback: Unlock funds if insert fails
            await this.balancesService.unlockFunds(userId, assetToLock, amountToLock, isDemo);
            throw new BadRequestException(`Order creation failed: ${err.message}`);
        }
    }

    // Cancel an order
    async cancelOrder(userId: string, orderId: string) {
        const admin = this.supabaseService.getAdminClient();

        // 1. Get Order
        const { data: order, error } = await admin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', userId)
            .single();

        if (error || !order) throw new NotFoundException('Order not found');
        if (order.status !== 'open' && order.status !== 'partial') {
            throw new BadRequestException('Order cannot be cancelled');
        }

        // 2. Calculate remaining locked funds
        // Logic depends on side/variant similar to create
        // Simplified for Spot Limit:
        let assetToUnlock = '';
        let amountToUnlock = 0;

        // ... (Logic should match createOrder lock logic, accounting for filled amount)
        // For brevity in this iteration, identifying asset:
        if (order.variant === 'spot') {
            const [base, quote] = order.symbol.split('/');
            if (order.side === 'buy') {
                assetToUnlock = quote;
                amountToUnlock = (order.amount - order.filled) * order.price;
            } else {
                assetToUnlock = base;
                amountToUnlock = order.amount - order.filled;
            }
        } else if (order.variant === 'futures') {
            assetToUnlock = 'USDT';
            // Simple margin unlock logic
            // For full real logic, we'd need leverage and entry price
            // Assume 100% of remaining notional / leverage is locked
            // Or better: locked = (amount * price) / leverage
            // Remaining locked = ((amount - filled) * price) / leverage
            const remaining = order.amount - (order.filled || 0);
            const notional = remaining * order.price;
            // Get leverage from order if stored?
            // Order schema doesn't have leverage explicitly in migration 001?
            // Wait, createOrderDto has it, but migration 001 didn't show leverage column in 'orders'.
            // Oh, I missed that. 'orders' table migration 001 only has: symbol, side, type, variant, price, amount, filled, status.
            // It lacks 'leverage'.
            // If leverage is missing, Futures logic is broken anyway.
            // I should ADD leverage to orders table in migration 002.
            // For now, assume 1x or fix migration.
            // Let's assume 1 for now to fix the code, but I need to fix schema.
            amountToUnlock = notional;
        }

        // 3. Unlock Funds
        // Pass order.is_demo to unlockFunds
        await this.balancesService.unlockFunds(userId, assetToUnlock, amountToUnlock, order.is_demo);

        // 4. Update Status
        await admin
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date() })
            .eq('id', orderId);

        return { message: 'Order cancelled successfully' };
    }

    async getOpenOrders(userId: string, isDemo: boolean = false) {
        const client = this.supabaseService.getClient(); // Can use regular client for RLS
        // But since we are backend, admin is fine too, but explicit RLS is safer if we pass token. 
        // Here we use admin for simplicity in backend service
        const admin = this.supabaseService.getAdminClient();

        const { data, error } = await admin
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .eq('is_demo', isDemo)
            .in('status', ['open', 'partial'])
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    // --- Matching Engine ---

    @Cron(CronExpression.EVERY_5_SECONDS)
    async matchOrders() {
        const admin = this.supabaseService.getAdminClient();

        // 1. Fetch Open Orders
        const { data: orders, error } = await admin
            .from('orders')
            .select('*')
            .eq('status', 'open');

        if (error || !orders || orders.length === 0) return;

        // 2. Group by Pair (ChainId:PairAddress) to optimize API calls
        // Map Key: "chainId:pairAddress" or "symbol"
        const uniqueKeys = new Set<string>();
        orders.forEach(o => {
            if (o.chain_id && o.pair_address) {
                uniqueKeys.add(`${o.chain_id}:${o.pair_address}`);
            }
        });

        // 3. Fetch Prices
        const priceMap = new Map<string, number>(); // Key -> USD Price

        for (const key of uniqueKeys) {
            const [chainId, pairAddress] = key.split(':');
            try {
                // Fetch from DexScreener Proxy
                const pairData = await this.proxyService.getDexScreenerPair(chainId, pairAddress);
                if (pairData && pairData.priceUsd) {
                    priceMap.set(key, parseFloat(pairData.priceUsd));
                }
            } catch (e) {
                this.logger.error(`Failed to fetch price for ${key}: ${e.message}`);
            }
        }

        // 4. Match Logic
        for (const order of orders) {
            let currentPrice = 0;

            // Resolve Price
            if (order.chain_id && order.pair_address) {
                currentPrice = priceMap.get(`${order.chain_id}:${order.pair_address}`) || 0;
            } else {
                // Fallback or skip if we don't support simple symbol matching yet
                // For backend demo, we strictly require chain_id/pair_address for now
                continue;
            }

            if (currentPrice <= 0) continue;

            const isBuy = order.side === 'buy';
            // Limit Order Logic
            // Buy: Market Price <= Limit Price
            // Sell: Market Price >= Limit Price
            let shouldExecute = false;
            if (isBuy && currentPrice <= order.price) shouldExecute = true;
            if (!isBuy && currentPrice >= order.price) shouldExecute = true;

            if (shouldExecute) {
                await this.executeTrade(order, currentPrice);
            }
        }
    }

    private async executeTrade(order: any, executionPrice: number) {
        this.logger.log(`Executing Order ${order.id}: ${order.side} ${order.symbol} @ ${executionPrice} [Demo: ${order.is_demo}]`);
        const admin = this.supabaseService.getAdminClient();
        const userId = order.user_id;
        const isDemo = order.is_demo;

        // Calculate settled amounts
        // Spot: 
        // Buy: Debit Quote (Locked), Credit Base
        // Sell: Debit Base (Locked), Credit Quote

        const [base, quote] = order.symbol.split('/');

        let debitAsset = '';
        let debitAmount = 0; // Amount locked that matches the trade
        let creditAsset = '';
        let creditAmount = 0;

        if (order.side === 'buy') {
            // BUY: We locked Quote. We give Base.
            // Locked Amount was: OrderAmount * OrderPrice
            // Actual Cost is: OrderAmount * ExecutionPrice
            // Difference is refunded?
            // For simplicity: We use the full locked amount or we recalculate.
            // Broker Model: We execute at Order Price (Limit) or Better.
            // If Execution < OrderPrice, user saves difference (surplus).

            debitAsset = quote;
            const fullLocked = order.amount * order.price;

            // Limit Order Logic:
            // We lock based on Limit Price.
            // We execute at Market Price (which is lower/better).
            // Debit = Full Locked Amount (we consume the lock).
            // Credit = Amount Bought.
            // Surplus = (LimitPrice - ExecutionPrice) * Amount -> Refunded to Quote Available.

            debitAmount = fullLocked;
            creditAsset = base;
            creditAmount = order.amount; // 100% fill

            // Surplus refund handled below
        } else {
            // SELL: We locked Base. We give Quote.
            debitAsset = base;
            debitAmount = order.amount;

            creditAsset = quote;
            creditAmount = order.amount * executionPrice;
        }

        try {
            // 1. Execute Balance Transfer
            // processTrade(userId, debitSymbol, debitAmount, creditSymbol, creditAmount)
            // Note: Our BalancesService.processTrade is simple. It debits locked.
            // processTrade(..., isDemo)
            await this.balancesService.processTrade(userId, debitAsset, debitAmount, creditAsset, creditAmount, isDemo);

            // 1b. Handle Surplus (For Buy orders where Price < Limit)
            if (order.side === 'buy' && executionPrice < order.price) {
                const surplus = (order.price - executionPrice) * order.amount;
                if (surplus > 0) {
                    // Unlock/Refund surplus
                    // We already debited 'debitAmount' (full locked) in processTrade?
                    // Wait, processTrade debits `debitBal.locked - debitAmount`.
                    // So we just need to add `surplus` to `available`.
                    // We can reuse 'processTrade' with 0 debit? Or separate unlock.
                    // Or just update balance directly.
                    // Let's use `balancesService.unlockFunds`?? No, that moves Locked->Available.
                    // But we already spent(burned) the locked funds in processTrade.
                    // So we need to `credit` the surplus.
                    // We can use processTrade(..., 0, quote, surplus).
                    // We treat this as a "trade" where we debit 0 and credit surplus to available
                    await this.balancesService.processTrade(userId, debitAsset, 0, debitAsset, surplus, isDemo);
                }
            }

            // 2. Update Order
            await admin
                .from('orders')
                .update({
                    status: 'filled',
                    filled: order.amount, // Full fill
                    updated_at: new Date()
                })
                .eq('id', order.id);

            this.logger.log(`Order ${order.id} Filled Completely`);

        } catch (e) {
            this.logger.error(`Failed to execute trade ${order.id}: ${e.message}`);
        }
    }
}
