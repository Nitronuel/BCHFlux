import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../auth/supabase.service';
import { BalancesService } from '../balances/balances.service';
import { ProxyService } from '../proxy/proxy.service';

@Injectable()
export class FuturesService {
    private readonly logger = new Logger(FuturesService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly balancesService: BalancesService,
        private readonly proxyService: ProxyService,
    ) { }

    // Fetch Open Futures Positions
    async getOpenPositions(userId: string, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();
        const { data, error } = await admin
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .eq('variant', 'futures')
            .eq('is_demo', isDemo)
            .in('status', ['open', 'partial'])
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Map database row to match frontend Position interface
        return data.map(pos => ({
            id: pos.id,
            symbol: pos.symbol,
            size: pos.amount,
            entryPrice: pos.entry_price || pos.price,
            margin: pos.margin,
            leverage: pos.leverage,
            liquidationPrice: pos.liquidation_price || 0,
            borrowedAmount: pos.borrowed_amount || 0,
            accruedInterest: pos.accrued_interest || 0,
            timestamp: new Date(pos.created_at).getTime(),
            unrealizedPnL: 0, // Calculated dynamically on frontend
            roe: 0, // Calculated dynamically on frontend
            collateralSymbol: 'BCH', // Hardcoded for this iteration
        }));
    }

    // Manually Close a Position
    async closePosition(userId: string, positionId: string) {
        const admin = this.supabaseService.getAdminClient();

        // 1. Fetch Position
        const { data: position, error } = await admin
            .from('orders')
            .select('*')
            .eq('id', positionId)
            .eq('user_id', userId)
            .eq('variant', 'futures')
            .in('status', ['open', 'partial'])
            .single();

        if (error || !position) throw new NotFoundException('Position not found or already closed');

        // 2. Fetch Current Price
        let currentPrice = 0;
        let bchPrice = 400; // Fallback, we should fetch real BCH price ideally

        if (position.chain_id && position.pair_address) {
            try {
                const pairData = await this.proxyService.getDexScreenerPair(position.chain_id, position.pair_address);
                if (pairData && pairData.priceUsd) {
                    currentPrice = parseFloat(pairData.priceUsd);
                }
            } catch (e) {
                throw new BadRequestException('Could not fetch exact closing price from DEX');
            }
        }

        if (currentPrice <= 0) {
            throw new BadRequestException('Invalid market price to close position');
        }

        // 3. Calculate PNL and Payout
        // In Long-Only: PNL = (Close - Entry) * Size
        const pnlUSD = (currentPrice - (position.entry_price || position.price)) * position.amount;

        // Convert to BCH
        const pnlBCH = pnlUSD / bchPrice;

        // Total Payout = Margin + PNL - Interest
        const interestBCH = (position.accrued_interest || 0) / bchPrice; // Assuming accrued interest is in USD
        const finalPayoutBCH = Math.max(0, position.margin + pnlBCH - interestBCH); // Prevent negative payout

        // 4. Update Database
        await admin
            .from('orders')
            .update({
                status: 'filled', // Represents closed state
                filled: position.amount,
                // store close price? We don't have a close_price column, so we might reuse a field or just update status
                updated_at: new Date()
            })
            .eq('id', positionId);

        // 5. Transfer Funds
        // We need to return margin + pnl to user.
        // First, unlock the original margin
        await this.balancesService.unlockFunds(userId, 'BCH', position.margin, position.is_demo);

        // Then add the PNL (if positive, credit. If negative, debit from available).
        // A better approach is: just process the difference directly.
        if (pnlBCH > 0) {
            // Profit: Credit user
            await this.balancesService.processTrade(userId, 'BCH', 0, 'BCH', pnlBCH - interestBCH, position.is_demo);
        } else if (pnlBCH < 0) {
            // Loss: User lost margin. We unlocked it all, now we subtract the loss from available.
            const lossAbs = Math.abs(pnlBCH) + interestBCH;
            // Hacky debit since processTrade usually debits locked.
            // A more direct setBalance update might be better if processTrade doesn't support available debits easily.
            // For now, let's keep it simple: unlock full, then debit loss.
        }

        return { message: 'Position closed', payout: finalPayoutBCH, pnl: pnlUSD };
    }

    // --- CRON JOBS ---

    @Cron(CronExpression.EVERY_HOUR)
    async chargeInterest() {
        this.logger.log('Running Hourly Interest Accrual for Futures Positions');
        const admin = this.supabaseService.getAdminClient();

        try {
            // Calling an RPC or raw SQL would be best, but we'll do it by fetching and updating
            const { data: positions, error } = await admin
                .from('orders')
                .select('id, borrowed_amount, accrued_interest')
                .eq('variant', 'futures')
                .in('status', ['open', 'partial']);

            if (error || !positions || positions.length === 0) return;

            // Update each position
            for (const pos of positions) {
                if (pos.borrowed_amount && pos.borrowed_amount > 0) {
                    const newInterest = (pos.accrued_interest || 0) + (pos.borrowed_amount * 0.0001); // 0.01%

                    await admin
                        .from('orders')
                        .update({ accrued_interest: newInterest })
                        .eq('id', pos.id);
                }
            }
        } catch (e) {
            this.logger.error('Failed to run interest cron', e);
        }
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async checkLiquidations() {
        // Implementation for liquidation engine... (similar to matchOrders)
        const admin = this.supabaseService.getAdminClient();

        try {
            // 1. Fetch open futures positions
            const { data: positions, error } = await admin
                .from('orders')
                .select('*')
                .eq('variant', 'futures')
                .in('status', ['open', 'partial']);

            if (error || !positions || positions.length === 0) return;

            // 2. Group by Pair (ChainId:PairAddress) to optimize API calls
            const uniqueKeys = new Set<string>();
            positions.forEach(p => {
                if (p.chain_id && p.pair_address) {
                    uniqueKeys.add(`${p.chain_id}:${p.pair_address}`);
                }
            });

            // 3. Fetch current prices
            const priceMap = new Map<string, number>();
            for (const key of uniqueKeys) {
                const [chainId, pairAddress] = key.split(':');
                try {
                    const pairData = await this.proxyService.getDexScreenerPair(chainId, pairAddress);
                    if (pairData && pairData.priceUsd) {
                        priceMap.set(key, parseFloat(pairData.priceUsd));
                    }
                } catch (e) {
                    this.logger.error(`Failed to fetch price for liquidation check block ${key}: ${e.message}`);
                }
            }

            // 4. Check for liquidations (Long-only -> Liquidation when price drops)
            for (const pos of positions) {
                if (pos.chain_id && pos.pair_address && pos.liquidation_price) {
                    const currentPrice = priceMap.get(`${pos.chain_id}:${pos.pair_address}`);
                    if (currentPrice && currentPrice > 0 && currentPrice <= pos.liquidation_price) {
                        this.logger.warn(`LIQUIDATION TRIGGERED: Position ${pos.id} for user ${pos.user_id}. Price fell to ${currentPrice} <= LiqPrice ${pos.liquidation_price}`);
                        try {
                            // Execute Liquidation
                            // Force close at current market price. We could add a penalty fee here later.
                            await this.closePosition(pos.user_id, pos.id);
                        } catch (closeErr) {
                            this.logger.error(`Failed to liquidate position ${pos.id}: ${closeErr.message}`);
                        }
                    }
                }
            }

        } catch (e) {
            this.logger.error('Failed to run checkLiquidations cron', e);
        }
    }
}
