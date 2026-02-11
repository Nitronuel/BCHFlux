import { create } from 'zustand';
import { fetchPrices, type PriceData } from '../services/api';
import { websocketService } from '../services/websocket';

// Coin IDs we want to track
const TRACKED_COINS = ['bitcoin-cash', 'bitcoin', 'ethereum', 'solana', 'tether'];

interface PriceState {
    prices: PriceData;
    previousPrices: PriceData; // For detecting price direction (flash effect)
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;
    isLive: boolean; // Whether WebSocket is connected

    // Actions
    loadPrices: () => Promise<void>;
    updatePrice: (coinId: string, price: number, change24h: number) => void;
    startLiveUpdates: () => () => void; // Returns unsubscribe function
}

export const usePriceStore = create<PriceState>((set, get) => ({
    prices: {},
    previousPrices: {},
    isLoading: false,
    error: null,
    lastUpdated: null,
    isLive: false,

    loadPrices: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await fetchPrices(TRACKED_COINS);
            set({
                prices: data,
                previousPrices: data, // Initialize previous prices
                isLoading: false,
                lastUpdated: Date.now(),
            });
        } catch (err) {
            set({
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to fetch prices',
            });
        }
    },

    updatePrice: (coinId: string, price: number, change24h: number) => {
        const { prices } = get();

        set({
            previousPrices: { ...prices },
            prices: {
                ...prices,
                [coinId]: {
                    usd: price,
                    usd_24h_change: change24h,
                },
            },
            lastUpdated: Date.now(),
            isLive: true,
        });
    },

    startLiveUpdates: () => {
        console.log('[PriceStore] Starting live updates...');
        const unsubscribe = websocketService.subscribe((coinId: string, price: number, change24h: number) => {
            get().updatePrice(coinId, price, change24h);
        });

        set({ isLive: true });

        return () => {
            console.log('[PriceStore] Stopping live updates...');
            unsubscribe();
            set({ isLive: false });
        };
    },
}));
