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
        const { symbol, side, type, price, amount, leverage, margin, liquidationPrice, variant, chainId, pairAddress, isDemo } = createOrderDto;

        // 1. Calculate required funds to lock
        let assetToLock = '';
        let amountToLock = 0;

        // Values to insert for Futures specifically
        let calculatedLiqPrice = liquidationPrice;
        let entryPrice = price;

        if (variant === 'futures') {
            // In our new architecture, margin is provided as BCH.
            // If the frontend didn't pass margin, we fallback to our old calculation (Notional / Leverage)
            assetToLock = 'BCH';
            const notional = (price || 0) * amount; // Market orders in futures need estimate? Assume limit for now
            if (!price && type === 'limit') throw new BadRequestException('Price required for limit orders');

            if (margin) {
                amountToLock = margin;
            } else {
                amountToLock = notional / (leverage || 1);
            }

            // Simple Auto-Liquidation calculation fallback if frontend didn't provide one
            if (!calculatedLiqPrice && price && leverage) {
                calculatedLiqPrice = side === 'buy'
                    ? price * (1 - (1 / leverage) + 0.005)
                    : price * (1 + (1 / leverage) - 0.005);
            }

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
            const insertData: any = {
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
                status: 'open',
                created_at: new Date(),
                is_demo: isDemo
            };

            // Add Futures fields if applicable
            if (variant === 'futures') {
                insertData.leverage = leverage || 1;
                insertData.margin = margin || amountToLock;
                insertData.entry_price = entryPrice;
                insertData.liquidation_price = calculatedLiqPrice;
                // Note: 'status' could technically be 'open_position' but we stick to 'open' for now
            }

            const { data, error } = await admin
                .from('orders')
                .insert(insertData)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return data;
        } catch (err) {
            require('fs').appendFileSync('server-debug.log', '[createOrder Error] ' + JSON.stringify({ message: err.message, details: err.details, hint: err.hint, code: err.code }) + '\n');

            // Rollback: Unlock funds if insert fails
            try {
                await this.balancesService.unlockFunds(userId, assetToLock, amountToLock, isDemo);
            } catch (rollbackErr) {
                console.error('[createOrder Rollback Error]', rollbackErr);
            }
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
            // Futures use BCH as collateral/margin in our new architecture
            assetToUnlock = 'BCH';
            const remaining = order.amount - (order.filled || 0);

            if (order.margin) {
                // Unlock the proportional amount of margin remaining
                amountToUnlock = order.margin * (remaining / order.amount);
            } else {
                // Fallback calculation
                const notional = remaining * (order.price || 0);
                amountToUnlock = notional / (order.leverage || 1);
            }
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

    // --- True Spot Matching Engine (P2P Orderbook) ---

    @Cron(CronExpression.EVERY_5_SECONDS)
    async matchOrders() {
        const admin = this.supabaseService.getAdminClient();

        // 1. Fetch Open or Partial Orders (Spot Only for now)
        const { data: orders, error } = await admin
            .from('orders')
            .select('*')
            .in('status', ['open', 'partial'])
            .eq('variant', 'spot');

        if (error || !orders || orders.length === 0) return;

        // 2. Group by Pair (ChainId:PairAddress or Symbol) and Demo Status
        // We MUST segregate Demo vs Live orders
        const orderbooks: { [key: string]: any[] } = {};

        orders.forEach(o => {
            // Group key identifies the exact market and environment
            const key = `${o.symbol}_${o.is_demo ? 'demo' : 'live'}`;
            if (!orderbooks[key]) orderbooks[key] = [];
            orderbooks[key].push(o);
        });

        // 3. Process each Orderbook
        for (const key in orderbooks) {
            const bookOrders = orderbooks[key];

            // Segregate Bids (Buys) and Asks (Sells)
            const bids = bookOrders.filter(o => o.side === 'buy');
            const asks = bookOrders.filter(o => o.side === 'sell');

            // Sort Bids: Highest Price First. Ties broken by older created_at. Market orders (price null or 0) treated as Infinity.
            bids.sort((a, b) => {
                const priceA = (a.type === 'market' || !a.price) ? Infinity : a.price;
                const priceB = (b.type === 'market' || !b.price) ? Infinity : b.price;
                if (priceA > priceB) return -1;
                if (priceA < priceB) return 1;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            // Sort Asks: Lowest Price First. Ties broken by older created_at. Market orders treated as 0.
            asks.sort((a, b) => {
                const priceA = (a.type === 'market' || !a.price) ? 0 : a.price;
                const priceB = (b.type === 'market' || !b.price) ? 0 : b.price;
                if (priceA < priceB) return -1;
                if (priceA > priceB) return 1;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            // 4. Matching Loop Strategy
            let bidIdx = 0;
            let askIdx = 0;

            while (bidIdx < bids.length && askIdx < asks.length) {
                const bid = bids[bidIdx];
                const ask = asks[askIdx];

                const bidPrice = (bid.type === 'market' || !bid.price) ? Infinity : bid.price;
                const askPrice = (ask.type === 'market' || !ask.price) ? 0 : ask.price;

                // Stop matching if highest bid is lower than lowest ask
                if (bidPrice < askPrice) {
                    break;
                }

                // MATCH FOUND!
                const remainingBid = bid.amount - (bid.filled || 0);
                const remainingAsk = ask.amount - (ask.filled || 0);

                const matchSize = Math.min(remainingBid, remainingAsk);

                // Determine Execution Price
                // Rule: If Limit vs Limit, Maker's price dictates.
                // If Market vs Limit, Limit price dictates.
                // If Market vs Market, we technically need an Oracle (DexScreener). For now, we fallback to a simple average or Oracle.
                let executionPrice = 0;

                if (bid.type === 'market' && ask.type === 'market') {
                    // Fallback to Oracle. If we can't reliably get Oracle synchronously here, we might skip or use last price.
                    // For pure on-chain or demo, we should fetch oracle.
                    // Doing a quick fetch if needed:
                    try {
                        const pairData = await this.proxyService.getDexScreenerPair(bid.chain_id, bid.pair_address);
                        executionPrice = pairData?.priceUsd ? parseFloat(pairData.priceUsd) : 0;
                    } catch (e) { executionPrice = 0; }

                    if (executionPrice === 0) {
                        this.logger.warn(`Cannot cross Market vs Market without Oracle price. Skipping.`);
                        break;
                    }
                } else if (bid.type === 'market') {
                    executionPrice = ask.price;
                } else if (ask.type === 'market') {
                    executionPrice = bid.price;
                } else {
                    // Limit vs Limit: Maker is the older order
                    const bidTime = new Date(bid.created_at).getTime();
                    const askTime = new Date(ask.created_at).getTime();
                    executionPrice = (bidTime <= askTime) ? bid.price : ask.price;
                }

                // 5. Execute the Match mathematically
                await this.processMatch(bid, ask, matchSize, executionPrice);

                // 6. Update local state to continue loop
                bid.filled = (bid.filled || 0) + matchSize;
                ask.filled = (ask.filled || 0) + matchSize;

                if (bid.filled >= bid.amount) bidIdx++;
                if (ask.filled >= ask.amount) askIdx++;
            }
        }
    }

    private async processMatch(bid: any, ask: any, matchSize: number, executionPrice: number) {
        this.logger.log(`Matching ${matchSize} ${bid.symbol} @ ${executionPrice} [Bid: ${bid.id}, Ask: ${ask.id}]`);
        const admin = this.supabaseService.getAdminClient();
        const isDemo = bid.is_demo; // Both are guaranteed to match based on our grouping

        const [base, quote] = bid.symbol.split('/'); // e.g., PEPE/BCH. Base = PEPE, Quote = BCH

        // === SETTLE BUYER (BID) ===
        // Buyer locked Quote based on their Limit price (or Oracle estimate if Market).
        // They receive Base (matchSize).
        // They pay (matchSize * executionPrice) in Quote.
        // If they locked using a higher Limit price, they get a surplus refund.

        const buyerQuoteCost = matchSize * executionPrice;
        const buyerQuoteLocked = bid.type === 'market' ? buyerQuoteCost : matchSize * bid.price; // Approximation, we actually locked amount*price initially.

        // Transfer: Deduct locked Quote, Add available Base
        await this.balancesService.processTrade(bid.user_id, quote, buyerQuoteCost, base, matchSize, isDemo);

        // Refund Surplus if execution price was better (lower) than Limit price
        if (bid.type === 'limit' && executionPrice < bid.price) {
            const surplus = (bid.price - executionPrice) * matchSize;
            if (surplus > 0) {
                // Unlock surplus back to available (Credit Quote, debit 0)
                await this.balancesService.processTrade(bid.user_id, quote, 0, quote, surplus, isDemo);
            }
        }

        // === SETTLE SELLER (ASK) ===
        // Seller locked Base (matchSize).
        // They receive Quote (matchSize * executionPrice).

        await this.balancesService.processTrade(ask.user_id, base, matchSize, quote, buyerQuoteCost, isDemo);

        // === UPDATE STATUSES ===
        // We update the DB for both orders
        const updateOrderStatus = async (order: any) => {
            const newFilled = (order.filled || 0) + matchSize; // We use the DB's previous state + new match to be safe, but we also tracked it in memory
            const status = newFilled >= order.amount ? 'filled' : 'partial';

            await admin.from('orders').update({
                filled: newFilled,
                status: status,
                updated_at: new Date()
            }).eq('id', order.id);
        };

        await updateOrderStatus(bid);
        await updateOrderStatus(ask);
    }
}
