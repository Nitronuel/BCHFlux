// Price Polling Service: Backend Proxy → CoinGecko (Majors) + DexScreener (Custom Tokens)
// All API calls go through the NestJS backend to avoid CORS issues and rate limiting

import axios from 'axios';

type PriceCallback = (coinId: string, price: number, change24h: number) => void;

// CoinGecko coin IDs we track for major assets
const TRACKED_COINS = [
    'bitcoin-cash',
    'bitcoin',
    'ethereum',
    'solana',
    'ripple',
    'dogecoin',
    'cardano',
    'polkadot',
    'chainlink',
    'litecoin',
    'tether',
    'binancecoin',
];

// Backend proxy base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const COINGECKO_POLL_INTERVAL = 15000;  // 15 seconds (avoid CoinGecko rate limits)
const DEXSCREENER_POLL_INTERVAL = 15000; // 15 seconds

class PricePollingService {
    private callbacks: PriceCallback[] = [];
    private coinGeckoTimer: ReturnType<typeof setInterval> | null = null;
    private dexScreenerTimer: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;

    // Custom tokens tracked via DexScreener (chainId + pairAddress)
    private customTokens: Map<string, { chainId: string; pairAddress: string }> = new Map();

    connect() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[PriceService] Starting price polling via backend proxy...');

        // Initial fetch
        this.fetchCoinGeckoPrices();
        this.fetchDexScreenerPrices();

        // Set up polling intervals
        this.coinGeckoTimer = setInterval(() => {
            this.fetchCoinGeckoPrices();
        }, COINGECKO_POLL_INTERVAL);

        this.dexScreenerTimer = setInterval(() => {
            this.fetchDexScreenerPrices();
        }, DEXSCREENER_POLL_INTERVAL);
    }

    private async fetchCoinGeckoPrices() {
        try {
            // Route through backend proxy to avoid CORS
            const ids = TRACKED_COINS.join(',');
            const url = `${API_BASE}/api/proxy/coingecko/prices?ids=${ids}&vs_currency=usd`;
            const response = await axios.get(url);
            const data = response.data;

            // Notify subscribers for each coin
            for (const coinId of TRACKED_COINS) {
                if (data[coinId]) {
                    const price = data[coinId].usd;
                    const change24h = data[coinId].usd_24h_change || 0;
                    this.notify(coinId, price, change24h);
                }
            }
        } catch (err) {
            // Silent fail — don't spam console
            console.warn('[PriceService] Price fetch failed:', (err as Error).message);
        }
    }

    private async fetchDexScreenerPrices() {
        if (this.customTokens.size === 0) return;

        for (const [coinId, { chainId, pairAddress }] of this.customTokens) {
            try {
                // Route through backend proxy to avoid CORS
                const url = `${API_BASE}/api/proxy/dexscreener/pairs/${chainId}/${pairAddress}`;
                const response = await axios.get(url);
                const pair = response.data?.pair || response.data?.pairs?.[0];

                if (pair) {
                    const price = parseFloat(pair.priceUsd || '0');
                    const change24h = pair.priceChange?.h24 || 0;
                    if (price > 0) {
                        this.notify(coinId, price, change24h);
                    }
                }
            } catch (err) {
                console.warn(`[PriceService] DexScreener fetch failed for ${coinId}:`, (err as Error).message);
            }
        }
    }

    /**
     * Register a custom token to track via DexScreener
     */
    trackCustomToken(coinId: string, chainId: string, pairAddress: string) {
        this.customTokens.set(coinId, { chainId, pairAddress });
        console.log(`[PriceService] Tracking custom token: ${coinId} (${chainId}/${pairAddress})`);
    }

    /**
     * Remove a custom token from tracking
     */
    untrackCustomToken(coinId: string) {
        this.customTokens.delete(coinId);
    }

    private notify(coinId: string, price: number, change24h: number) {
        this.callbacks.forEach(cb => cb(coinId, price, change24h));
    }

    subscribe(callback: PriceCallback) {
        this.callbacks.push(callback);
        if (this.callbacks.length === 1) {
            this.connect();
        }
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
            if (this.callbacks.length === 0) {
                this.disconnect();
            }
        };
    }

    private disconnect() {
        if (this.coinGeckoTimer) clearInterval(this.coinGeckoTimer);
        if (this.dexScreenerTimer) clearInterval(this.dexScreenerTimer);
        this.coinGeckoTimer = null;
        this.dexScreenerTimer = null;
        this.isRunning = false;
        console.log('[PriceService] Stopped polling.');
    }
}

// Export with the SAME name so existing imports don't break
export const websocketService = new PricePollingService();
