import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../lib/axios';

// Pricing Engine Formula: Rate = BCH_USD / Token_USD
// Returns: How many Tokens per 1 BCH
export const calculateCrossRate = (tokenPriceUsd: number, bchPriceUsd: number): number => {
    if (!tokenPriceUsd || !bchPriceUsd) return 0;
    return bchPriceUsd / tokenPriceUsd;
};

export type AccountMode = 'demo' | 'real';

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
    entryCollateralPrice?: number;
}

export interface Balance {
    available: number;
    locked: number;
    averageBuyPrice?: number;
}

// Default demo balances
const DEMO_BALANCES: Record<string, Balance> = {
    'BCH': { available: 10, locked: 0, averageBuyPrice: 350 },
    'USDT': { available: 1000, locked: 0 },
};

const DEMO_LEVERAGE_BALANCES: Record<string, Balance> = {
    'BCH': { available: 10, locked: 0, averageBuyPrice: 350 },
};

interface UserState {
    userId: string | null;
    accountMode: AccountMode;
    // Legacy compat — derived from accountMode
    isDemoMode: boolean;

    // Balances
    balances: Record<string, Balance>;
    leverageBalances: Record<string, Balance>;

    // Trading
    orders: Order[];
    positions: Position[];

    // Actions
    initialize: () => void;
    setAccountMode: (mode: AccountMode) => void;
    syncRealBalance: (bch: number, usdValue: number) => void;

    // Legacy compat
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
            accountMode: 'demo',
            // isDemoMode derived for backward compat
            get isDemoMode() {
                return this.accountMode === 'demo';
            },

            // Initial Balances (Demo Mode by default)
            balances: { ...DEMO_BALANCES },
            leverageBalances: { ...DEMO_LEVERAGE_BALANCES },

            /**
             * Set account mode: 'demo' or 'real'
             * Resets balances, orders, and positions for the new mode.
             */
            setAccountMode: (mode: AccountMode) => {
                if (mode === 'demo') {
                    // Switch to demo — reset to demo balances
                    set({
                        accountMode: 'demo',
                        balances: { ...DEMO_BALANCES },
                        leverageBalances: { ...DEMO_LEVERAGE_BALANCES },
                        orders: [],
                        positions: [],
                    });
                } else {
                    // Switch to real — start with 0 BCH, will be synced from wallet
                    set({
                        accountMode: 'real',
                        balances: {
                            'BCH': { available: 0, locked: 0 },
                        },
                        leverageBalances: {
                            'BCH': { available: 0, locked: 0 },
                        },
                        orders: [],
                        positions: [],
                    });
                }
            },

            /**
             * Sync real BCH balance from the connected wallet.
             * Only updates BCH in the balances — called from balance polling.
             */
            syncRealBalance: (bch: number, usdValue: number) => {
                const { accountMode } = get();
                if (accountMode !== 'real') return;

                set((state) => ({
                    balances: {
                        ...state.balances,
                        'BCH': {
                            ...state.balances['BCH'],
                            available: Math.max(0, bch - (state.balances['BCH']?.locked || 0)),
                            locked: state.balances['BCH']?.locked || 0,
                            averageBuyPrice: usdValue > 0 && bch > 0 ? usdValue / bch : undefined,
                        },
                    },
                }));
            },

            // Legacy compat
            toggleDemoMode: (enabled: boolean) => {
                get().setAccountMode(enabled ? 'demo' : 'real');
            },

            initialize: async () => {
                const { userId } = get();
                if (!userId) {
                    try {
                        const res = await apiClient.post('/api/dev/init');
                        if (res.data && res.data.userId) {
                            set({ userId: res.data.userId });
                            await get().fetchBalances();
                        }
                    } catch (e) {
                        console.error('Failed to init dev user', e);
                        const newId = crypto.randomUUID();
                        set({ userId: newId });
                    }
                }
            },

            orders: [],
            positions: [],

            fetchBalances: async () => {
                const { userId, accountMode } = get();
                if (!userId) return;

                // In real mode, balances come from wallet sync, not backend
                if (accountMode === 'real') return;

                try {
                    const res = await apiClient.get(`/api/balances?userId=${userId}&isDemo=true`);
                    if (res.data) {
                        const newBalances: Record<string, Balance> = {};
                        if (Array.isArray(res.data)) {
                            res.data.forEach((b: any) => {
                                newBalances[b.token_symbol] = {
                                    available: b.available,
                                    locked: b.locked
                                };
                            });
                        }
                        if (Object.keys(newBalances).length > 0) {
                            set({ balances: newBalances });
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch balances', e);
                }
            },

            fetchOrders: async () => {
                const { userId, accountMode } = get();
                if (!userId) return;

                try {
                    const res = await apiClient.get(`/api/orders?userId=${userId}&isDemo=${accountMode === 'demo'}`);
                    if (res.data) {
                        set({ orders: res.data });
                    }
                } catch (e) {
                    console.error('Failed to fetch orders', e);
                }
            },

            addOrder: async (order: Order) => {
                const { accountMode, userId } = get();
                if (!userId) return false;

                try {
                    await apiClient.post('/api/orders', {
                        ...order,
                        userId,
                        variant: order.variant || 'spot',
                        chainId: order.chainId,
                        pairAddress: order.pairAddress,
                        isDemo: accountMode === 'demo'
                    });
                    await get().fetchOrders();
                    if (accountMode === 'demo') {
                        await get().fetchBalances();
                    }
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
                if (!order || (order.status !== 'Open' && order.status !== 'Partial')) return state;

                const [base, quote] = order.symbol.split('/');
                const remaining = order.amount - (order.filled || 0);
                if (fillAmount > remaining) fillAmount = remaining;
                if (fillAmount <= 0) return state;

                const newState = { ...state };
                const newBalances = { ...state.balances };

                if (order.side === 'buy') {
                    const lockedForChunk = fillAmount * order.price;
                    const actualCost = fillAmount * fillPrice;

                    const quoteBal = newBalances[quote] || { available: 0, locked: 0 };
                    const baseBal = newBalances[base] || { available: 0, locked: 0, averageBuyPrice: 0 };

                    const oldTotal = baseBal.available + baseBal.locked;
                    const currentAvg = baseBal.averageBuyPrice || 0;
                    const oldVal = oldTotal * currentAvg;
                    const newVal = fillAmount * fillPrice;
                    const newAvg = oldTotal + fillAmount > 0 ? (oldVal + newVal) / (oldTotal + fillAmount) : fillPrice;

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
                const newFilled = (order.filled || 0) + fillAmount;
                const newStatus = newFilled >= order.amount ? 'Filled' : 'Partial';

                newState.orders = state.orders.map(o =>
                    o.id === orderId
                        ? { ...o, filled: newFilled, filledPrice: fillPrice, status: newStatus }
                        : o
                );

                return newState;
            }),

            openPosition: (positionData) => {
                const { balances, leverageBalances, positions } = get();

                const isFutures = true;
                const collateralAsset = isFutures ? 'BCH' : 'USDT';

                const notionalUSD = positionData.entryPrice * positionData.size;
                const marginUSD = notionalUSD / positionData.leverage;

                const targetBalances = isFutures ? leverageBalances : balances;
                const currentBal = targetBalances[collateralAsset] || { available: 0, locked: 0 };

                let marginRequiredToken = 0;
                if (collateralAsset === 'BCH') {
                    marginRequiredToken = positionData.margin;
                } else {
                    marginRequiredToken = marginUSD;
                }

                if (currentBal.available < marginRequiredToken) {
                    return false;
                }

                const newPosition: Position = {
                    ...positionData,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now(),
                    unrealizedPnL: 0,
                    roe: 0,
                    collateralSymbol: collateralAsset,
                    entryCollateralPrice: positionData.entryCollateralPrice
                };

                const newTargetBalances = {
                    ...targetBalances,
                    [collateralAsset]: {
                        ...currentBal,
                        available: currentBal.available - marginRequiredToken,
                        locked: currentBal.locked + marginRequiredToken
                    }
                };

                set(() => ({
                    positions: [newPosition, ...positions],
                    ...(isFutures ? { leverageBalances: newTargetBalances } : { balances: newTargetBalances })
                }));
                return true;
            },

            closePosition: (positionId: string, closePrice: number) => set((state) => {
                const position = state.positions.find(p => p.id === positionId);
                if (!position) return state;

                let pnlUSD = 0;
                if (position.side === 'Long') {
                    pnlUSD = (closePrice - position.entryPrice) * position.size;
                } else {
                    pnlUSD = (position.entryPrice - closePrice) * position.size;
                }

                const collateralAsset = position.collateralSymbol || 'USDT';
                const isFutures = collateralAsset === 'BCH';
                const targetBalances = isFutures ? state.leverageBalances : state.balances;

                const bal = targetBalances[collateralAsset] || { available: 0, locked: 0 };
                let payout = 0;

                if (collateralAsset === 'BCH') {
                    let bchPrice = 0;
                    if (position.symbol.includes('BCH')) {
                        bchPrice = closePrice;
                    } else {
                        bchPrice = 400;
                    }
                    const pnlBCH = bchPrice > 0 ? pnlUSD / bchPrice : 0;
                    payout = position.margin + pnlBCH;
                } else {
                    payout = position.margin + pnlUSD;
                }

                const newTargetBalances = {
                    ...targetBalances,
                    [collateralAsset]: {
                        ...bal,
                        available: Math.max(0, bal.available + payout),
                        locked: Math.max(0, bal.locked - position.margin)
                    }
                };

                return {
                    positions: state.positions.filter(p => p.id !== positionId),
                    ...(isFutures ? { leverageBalances: newTargetBalances } : { balances: newTargetBalances })
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
                            available: Math.max(0, current.available + amount)
                        }
                    }
                };
            }),

            syncPositionPnL: (markets) => set((state) => {
                if (state.positions.length === 0) return state;

                return {
                    positions: state.positions.map(pos => {
                        const market = markets.find(m =>
                            m.symbol.toUpperCase() === pos.symbol.toUpperCase() ||
                            m.symbol.toUpperCase().replace('USDT', '') === pos.symbol.toUpperCase()
                        );

                        if (!market) return pos;

                        const markPrice = market.current_price;
                        let pnl = 0;
                        if (pos.side === 'Long') {
                            pnl = (markPrice - pos.entryPrice) * pos.size;
                        } else {
                            pnl = (pos.entryPrice - markPrice) * pos.size;
                        }

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
            name: 'user-storage-v5',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (state.balances) {
                        const repairedBalances = repairBalances(state.balances);
                        const hasNegative = Object.entries(state.balances).some(
                            ([, bal]) => bal.available < 0 || bal.locked < 0
                        );
                        if (hasNegative) {
                            console.warn('[UserStore] Repaired negative balances');
                            useUserStore.setState({ balances: repairedBalances });
                        }
                    }
                    if (state.leverageBalances) {
                        const repairedLeverage = repairBalances(state.leverageBalances);
                        const hasNegativeLev = Object.entries(state.leverageBalances).some(
                            ([, bal]) => bal.available < 0 || bal.locked < 0
                        );
                        if (hasNegativeLev) {
                            console.warn('[UserStore] Repaired negative leverage balances');
                            useUserStore.setState({ leverageBalances: repairedLeverage });
                        }
                    }
                }
            }
        }
    )
);

export default useUserStore;
