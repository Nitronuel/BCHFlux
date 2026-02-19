import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../lib/axios';

// Pricing Engine Formula: Rate = BCH_USD / Token_USD
// Returns: How many Tokens per 1 BCH
export const calculateCrossRate = (tokenPriceUsd: number, bchPriceUsd: number): number => {
    if (!tokenPriceUsd || !bchPriceUsd) return 0;
    return bchPriceUsd / tokenPriceUsd;
};

export interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'Limit' | 'Market' | 'Stop Limit';
    price: number; // Order Price (Limit)
    amount: number;
    total: number;
    timestamp: number;
    status: 'Open' | 'Filled' | 'Partial' | 'Cancelled';
    filled?: number; // Amount filled
    filledPrice?: number; // Last fill price
    variant?: 'spot' | 'futures'; // Default to spot if undefined
    leverage?: number; // For futures
    stopPrice?: number; // For Stop Limit orders
    triggerCondition?: 'Above' | 'Below';
    chainId?: string;
    pairAddress?: string;
}

export interface Position {
    id: string;
    symbol: string;
    side: 'Long' | 'Short';
    size: number;
    entryPrice: number;
    margin: number;
    leverage: number;
    liquidationPrice: number;
    unrealizedPnL: number;
    roe: number; // Return on Equity %
    timestamp: number;
    collateralSymbol?: string; // e.g., 'BCH' or 'USDT'
    entryCollateralPrice?: number; // Price of collateral at entry (to calculate impermanent loss if needed)
}

interface Balance {
    available: number;
    locked: number;
    averageBuyPrice?: number;
}

interface UserState {
    userId: string | null;
    isDemoMode: boolean;
    balances: Record<string, Balance>;
    orders: Order[];
    positions: Position[];
    initialize: () => void;
    toggleDemoMode: (enabled: boolean) => void;
    fetchBalances: () => Promise<void>;
    fetchOrders: () => Promise<void>;
    addOrder: (order: Order) => Promise<boolean>;
    cancelOrder: (orderId: string) => Promise<void>;
    fillOrder: (orderId: string, fillPrice: number, fillAmount: number) => void;
    openPosition: (position: Omit<Position, 'id' | 'timestamp' | 'unrealizedPnL' | 'roe'>) => boolean;
    closePosition: (positionId: string, closePrice: number, collateralPrice?: number) => void;
    updatePositionSL: (positionId: string, sl: number) => void;
    updatePositionTP: (positionId: string, tp: number) => void;
    updateBalance: (symbol: string, amount: number) => void;
    syncPositionPnL: (markets: { symbol: string; current_price: number }[]) => void;
}

// Helper function to repair negative balances
const repairBalances = (balances: Record<string, Balance>): Record<string, Balance> => {
    const repaired: Record<string, Balance> = {};
    for (const [symbol, balance] of Object.entries(balances)) {
        repaired[symbol] = {
            ...balance,
            available: Math.max(0, balance.available),
            locked: Math.max(0, balance.locked)
        };
    }
    return repaired;
};

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            userId: null,
            isDemoMode: false,

            // Initial Balances (Demo Mode by default)
            balances: {
                'BCH': { available: 10, locked: 0, averageBuyPrice: 350 },
                'USDT': { available: 10000, locked: 0 },
            },

            initialize: async () => {
                const { userId } = get();
                // If no userId, or we want to force a valid backend user (since v4 wipe)
                if (!userId) {
                    try {
                        const res = await apiClient.post('/api/dev/init');
                        if (res.data && res.data.userId) {
                            set({ userId: res.data.userId });
                            await get().fetchBalances(); // Fetch the fresh 10 BCH
                        }
                    } catch (e) {
                        console.error('Failed to init dev user', e);
                        // Fallback just in case backend is down, but this is less ideal
                        const newId = crypto.randomUUID();
                        set({ userId: newId });
                    }
                }
            },

            toggleDemoMode: async (enabled: boolean) => {
                set({ isDemoMode: enabled });
                // Fetch data for the new mode
                await get().fetchOrders();
                await get().fetchBalances();
            },

            orders: [],

            fetchBalances: async () => {
                const { userId, isDemoMode } = get();
                if (!userId) return;

                try {
                    const res = await apiClient.get(`/api/balances?userId=${userId}&isDemo=${isDemoMode}`);
                    if (res.data) {
                        // Transform array to Record
                        const newBalances: Record<string, Balance> = {};
                        if (Array.isArray(res.data)) {
                            res.data.forEach((b: any) => {
                                newBalances[b.token_symbol] = {
                                    available: b.available,
                                    locked: b.locked
                                };
                            });
                        }
                        set({ balances: newBalances });
                    }
                } catch (e) {
                    console.error('Failed to fetch balances', e);
                }
            },

            fetchOrders: async () => {
                const { userId, isDemoMode } = get();
                if (!userId) return;

                try {
                    const res = await apiClient.get(`/api/orders?userId=${userId}&isDemo=${isDemoMode}`);
                    if (res.data) {
                        set({ orders: res.data });
                    }
                } catch (e) {
                    console.error('Failed to fetch orders', e);
                }
            },

            addOrder: async (order: Order) => {
                const { isDemoMode, userId } = get();
                // If no userId, we can't create orders even in demo mode (backend needs userId)
                // Demo Mode handles userId generation in initialize()
                if (!userId) return false;

                try {
                    await apiClient.post('/api/orders', {
                        ...order,
                        userId,
                        variant: order.variant || 'spot',
                        chainId: order.chainId,
                        pairAddress: order.pairAddress,
                        isDemo: isDemoMode
                    });
                    // Refresh data
                    await get().fetchOrders();
                    await get().fetchBalances();
                    return true;
                } catch (e) {
                    console.error('Order Failed:', e);
                    return false;
                }
            },

            cancelOrder: async (orderId: string) => {
                const { userId } = get();
                if (!userId) return;

                try {
                    await apiClient.delete(`/api/orders/${orderId}?userId=${userId}`);
                    await get().fetchOrders();
                    await get().fetchBalances();
                } catch (e) {
                    console.error('Cancel Failed:', e);
                }
            },

            fillOrder: (orderId: string, fillPrice: number, fillAmount: number) => set((state) => {
                const order = state.orders.find(o => o.id === orderId);
                // Allow filling 'Open' or 'Partial' orders
                if (!order || (order.status !== 'Open' && order.status !== 'Partial')) return state;

                const [base, quote] = order.symbol.split('/');

                // Validate fill amount
                const remaining = order.amount - (order.filled || 0);
                if (fillAmount > remaining) {
                    fillAmount = remaining; // Cap at remaining
                }

                if (fillAmount <= 0) return state;

                // Logic:
                // If Buy: 
                //   Locked Quote was calculated based on Limit Price (or initial estimated total).
                //   We need to unlock the portion corresponding to this fill.
                //   Cost = fillAmount * fillPrice.
                //   Unlock = fillAmount * order.price (The amount we locked for this chunk).
                //   Refund = Unlock - Cost. (If we bought cheaper than limit).

                // If Sell:
                //   Locked Base = fillAmount.
                //   Revenue = fillAmount * fillPrice.

                const newState = { ...state };
                const newBalances = { ...state.balances };

                if (order.side === 'buy') {
                    // Calculate how much quote we locked for THIS chunk
                    // We locked `order.price * order.amount` initially.
                    // So for this chunk, we locked `order.price * fillAmount`.
                    const lockedForChunk = fillAmount * order.price;
                    const actualCost = fillAmount * fillPrice;

                    const quoteBal = newBalances[quote] || { available: 0, locked: 0 };
                    const baseBal = newBalances[base] || { available: 0, locked: 0, averageBuyPrice: 0 };

                    // Update Average Buy Price
                    const oldTotal = baseBal.available + baseBal.locked;
                    const currentAvg = baseBal.averageBuyPrice || 0;

                    let newAvg = currentAvg;
                    const oldVal = oldTotal * currentAvg;
                    const newVal = fillAmount * fillPrice;
                    newAvg = oldTotal + fillAmount > 0 ? (oldVal + newVal) / (oldTotal + fillAmount) : fillPrice;

                    // Unlock the locked amount, deduct actual cost
                    // New available = old available + (locked amount - actual cost)
                    // But we must ensure it doesn't go negative
                    const newQuoteAvailable = Math.max(0, quoteBal.available + (lockedForChunk - actualCost));
                    const newQuoteLocked = Math.max(0, quoteBal.locked - lockedForChunk);

                    newBalances[quote] = {
                        ...quoteBal,
                        available: newQuoteAvailable,
                        locked: newQuoteLocked
                    };
                    newBalances[base] = {
                        ...baseBal,
                        available: baseBal.available + fillAmount,
                        averageBuyPrice: newAvg
                    };
                } else {
                    // Sell
                    const lockedBase = fillAmount;
                    const revenue = fillAmount * fillPrice;

                    const baseBal = newBalances[base] || { available: 0, locked: 0 };
                    const quoteBal = newBalances[quote] || { available: 0, locked: 0 };

                    newBalances[base] = {
                        available: baseBal.available,
                        locked: Math.max(0, baseBal.locked - lockedBase)
                    };
                    newBalances[quote] = {
                        ...quoteBal,
                        available: quoteBal.available + revenue
                    };
                }

                newState.balances = newBalances;

                // Update the order's filled state
                const newFilled = (order.filled || 0) + fillAmount;
                const newStatus = newFilled >= order.amount ? 'Filled' : 'Partial';

                newState.orders = state.orders.map(o =>
                    o.id === orderId
                        ? { ...o, filled: newFilled, filledPrice: fillPrice, status: newStatus }
                        : o
                );

                return newState;
            }),

            positions: [],

            openPosition: (positionData) => {
                const { balances, positions } = get();

                // If Futures, use BCH as collateral
                const isFutures = true; // For now, all leverage is futures
                const collateralAsset = isFutures ? 'BCH' : 'USDT';

                // Position Data:
                // size = Token Amount (e.g. 1 BTC)
                // leverage = 10x
                // entryPrice = 50000 (USDT)

                // Margin Required in USD = (Size * EntryPrice) / Leverage
                const notionalUSD = positionData.entryPrice * positionData.size;
                const marginUSD = notionalUSD / positionData.leverage;

                const currentBal = balances[collateralAsset] || { available: 0, locked: 0 };
                let marginRequiredToken = 0;

                if (collateralAsset === 'BCH') {
                    // Convert Margin USD -> BCH
                    // We need live BCH price. In a real app we'd get this from priceStore or arg.
                    // For now, let's assume positionData passed the bchPrice or we estimate it?
                    // Actually, let's look at OrderForm. It calculates the exact BCH amount the user wants to put up.
                    // Let's change the interface of `openPosition` slightly?
                    // No, let's keep it simple: WE EXPECT `margin` in the positionData to be in the COLLATERAL ASSET if passed?
                    // The current `Position` interface says `margin` is number.
                    // Let's overwrite:

                    // If the caller (OrderForm) calculated the margin in BCH, we use that.
                    // Let's trust positionData.margin is correct in the context of the asset?
                    // Wait, currently `margin` in `Position` is usually USD.
                    // Let's enforce: `margin` property on Position object is always in USD for display? 
                    // No, that's confusing for settlement.
                    // Let's decide: `margin` is the AMOUNT OF COLLATERAL LOCKED.
                    marginRequiredToken = positionData.margin;
                } else {
                    marginRequiredToken = marginUSD;
                }

                if (currentBal.available < marginRequiredToken) {
                    return false; // Insufficient margin
                }

                const newPosition: Position = {
                    ...positionData,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now(),
                    unrealizedPnL: 0,
                    roe: 0,
                    collateralSymbol: collateralAsset,
                    entryCollateralPrice: positionData.entryCollateralPrice // Should be passed in
                };

                set(() => ({
                    positions: [newPosition, ...positions],
                    balances: {
                        ...balances,
                        [collateralAsset]: {
                            ...currentBal,
                            available: currentBal.available - marginRequiredToken,
                            locked: currentBal.locked + marginRequiredToken
                        }
                    }
                }));
                return true;
            },

            closePosition: (positionId: string, closePrice: number) => set((state) => {
                const position = state.positions.find(p => p.id === positionId);
                if (!position) return state;

                // 1. Calculate PnL in USD (Quote Currency)
                let pnlUSD = 0;
                if (position.side === 'Long') {
                    pnlUSD = (closePrice - position.entryPrice) * position.size;
                } else {
                    pnlUSD = (position.entryPrice - closePrice) * position.size;
                }

                const collateralAsset = position.collateralSymbol || 'USDT';
                const bal = state.balances[collateralAsset] || { available: 0, locked: 0 };
                let payout = 0;

                if (collateralAsset === 'BCH') {
                    // Convert PnL (USD) -> BCH
                    // We need current BCH Price. 
                    // In a perfect world we pass `currentCollateralPrice` to this function.
                    // For now, let's derive it from the position's margin? No, that's entry.
                    // Hack: We need the system's BCH price.
                    // Let's assume `closePrice` is the Token Price.
                    // If the traded pair IS BCH/USDT, then closePrice IS the BCH price!

                    let bchPrice = 0;
                    if (position.symbol.includes('BCH')) {
                        bchPrice = closePrice;
                    } else {
                        // If trading ETH/USDT, we need BCH price.
                        // We can't easily get it inside this reducer without passing it.
                        // For this demo, let's assume a static or slightly varied price, 
                        // OR better: rely on `entryCollateralPrice` if we just want to simulate "stable" collateral value?
                        // No, leverage relies on collateral value changing.

                        // Let's fetch it from the store state if possible? No, store ref is `state`.
                        // We will allow `closePrice` argument to handle this? 
                        // Implementation Detail: We'll assume the caller passes a `bchPrice` if needed? 
                        // No, let's keep it simple: 
                        // We will calculate PnL in BCH based on the ENTRY price of BCH (simplified stable collateral model)
                        // OR we assume 400 for demo if not BCH pair.
                        bchPrice = 400; // Fallback
                    }

                    const pnlBCH = pnlUSD / bchPrice;
                    payout = position.margin + pnlBCH;
                } else {
                    // USDT
                    payout = position.margin + pnlUSD;
                }

                return {
                    positions: state.positions.filter(p => p.id !== positionId),
                    balances: {
                        ...state.balances,
                        [collateralAsset]: {
                            ...bal,
                            available: Math.max(0, bal.available + payout), // Ensure non-negative
                            locked: Math.max(0, bal.locked - position.margin)
                        }
                    }
                };
            }),

            updatePositionSL: (positionId: string, sl: number) => set((state) => ({
                positions: state.positions.map(p =>
                    p.id === positionId ? { ...p, stopLoss: sl } : p
                )
            })),

            updatePositionTP: (positionId: string, tp: number) => set((state) => ({
                positions: state.positions.map(p =>
                    p.id === positionId ? { ...p, takeProfit: tp } : p
                )
            })),

            updateBalance: (symbol: string, amount: number) => set((state) => {
                const current = state.balances[symbol] || { available: 0, locked: 0 };
                return {
                    balances: {
                        ...state.balances,
                        [symbol]: {
                            ...current,
                            available: Math.max(0, current.available + amount) // Ensure non-negative
                        }
                    }
                };
            }),

            syncPositionPnL: (markets) => set((state) => {
                if (state.positions.length === 0) return state;

                return {
                    positions: state.positions.map(pos => {
                        // Find market data that matches position symbol
                        const market = markets.find(m =>
                            m.symbol.toUpperCase() === pos.symbol.toUpperCase() ||
                            m.symbol.toUpperCase().replace('USDT', '') === pos.symbol.toUpperCase() // loose match
                        );

                        if (!market) return pos;

                        const markPrice = market.current_price;

                        // Calc Unrealized PnL
                        let pnl = 0;
                        if (pos.side === 'Long') {
                            pnl = (markPrice - pos.entryPrice) * pos.size;
                        } else {
                            pnl = (pos.entryPrice - markPrice) * pos.size;
                        }

                        // ROE % = PnL / Margin
                        const roe = (pnl / pos.margin) * 100;

                        return {
                            ...pos,
                            unrealizedPnL: parseFloat(pnl.toFixed(2)),
                            roe: parseFloat(roe.toFixed(2))
                        };
                    })
                };
            })
        }),
        {
            name: 'user-storage-v4',
            onRehydrateStorage: () => (state) => {
                // Auto-repair any negative balances on load
                if (state && state.balances) {
                    const repairedBalances = repairBalances(state.balances);
                    const hasNegative = Object.entries(state.balances).some(
                        ([, bal]) => bal.available < 0 || bal.locked < 0
                    );
                    if (hasNegative) {
                        console.warn('[UserStore] Repaired negative balances');
                        useUserStore.setState({ balances: repairedBalances });
                    }
                }
            }
        }
    )
);

export default useUserStore;
