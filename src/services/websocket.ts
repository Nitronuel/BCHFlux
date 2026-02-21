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
const BASE_POLL_INTERVAL = 15000;     // 15 seconds normal
const MAX_POLL_INTERVAL = 120000;     // 2 minutes max backoff
const DEXSCREENER_POLL_INTERVAL = 15000;

class PricePollingService {
    private callbacks: PriceCallback[] = [];
    private coinGeckoTimer: ReturnType<typeof setTimeout> | null = null;
    private dexScreenerTimer: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;
    private consecutiveFailures = 0;

    // Custom tokens tracked via DexScreener (chainId + pairAddress)
    private customTokens: Map<string, { chainId: string; pairAddress: string }> = new Map();

    connect() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.consecutiveFailures = 0;

        console.log('[PriceService] Starting price polling via backend proxy...');

        // Initial fetch
        this.scheduleCoinGeckoPoll(0);

        // DexScreener on fixed interval
        this.fetchDexScreenerPrices();
        this.dexScreenerTimer = setInterval(() => {
            this.fetchDexScreenerPrices();
        }, DEXSCREENER_POLL_INTERVAL);
    }

    /**
     * Schedule next CoinGecko poll with exponential backoff on failures
     */
    private scheduleCoinGeckoPoll(delayMs: number) {
        if (!this.isRunning) return;

        this.coinGeckoTimer = setTimeout(async () => {
            await this.fetchCoinGeckoPrices();

            // Calculate next interval with backoff
            const nextInterval = this.consecutiveFailures > 0
                ? Math.min(BASE_POLL_INTERVAL * Math.pow(2, this.consecutiveFailures), MAX_POLL_INTERVAL)
                : BASE_POLL_INTERVAL;

            this.scheduleCoinGeckoPoll(nextInterval);
        }, delayMs);
    }

    private async fetchCoinGeckoPrices() {
        try {
            const ids = TRACKED_COINS.join(',');
            const url = `${API_BASE}/api/proxy/coingecko/prices?ids=${ids}&vs_currency=usd`;
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;

            // Reset failure count on success
            if (this.consecutiveFailures > 0) {
                console.log('[PriceService] ✅ Price fetch recovered');
            }
            this.consecutiveFailures = 0;

            // Notify subscribers for each coin
            for (const coinId of TRACKED_COINS) {
                if (data[coinId]) {
                    const price = data[coinId].usd;
                    const change24h = data[coinId].usd_24h_change || 0;
                    this.notify(coinId, price, change24h);
                }
            }
        } catch (err) {
            this.consecutiveFailures++;
            // Only log first failure and then every 5th failure to reduce console spam
            if (this.consecutiveFailures === 1 || this.consecutiveFailures % 5 === 0) {
                const backoffSec = Math.min(BASE_POLL_INTERVAL * Math.pow(2, this.consecutiveFailures), MAX_POLL_INTERVAL) / 1000;
                console.warn(`[PriceService] Price fetch failed (attempt ${this.consecutiveFailures}), next retry in ${backoffSec}s`);
            }
        }
    }

    private async fetchDexScreenerPrices() {
        if (this.customTokens.size === 0) return;

        for (const [coinId, { chainId, pairAddress }] of this.customTokens) {
            try {
                const url = `${API_BASE}/api/proxy/dexscreener/pairs/${chainId}/${pairAddress}`;
                const response = await axios.get(url, { timeout: 10000 });
                const pair = response.data?.pair || response.data?.pairs?.[0];

                if (pair) {
                    const price = parseFloat(pair.priceUsd || '0');
                    const change24h = pair.priceChange?.h24 || 0;
                    if (price > 0) {
                        this.notify(coinId, price, change24h);
                    }
                }
            } catch {
                // Silent fail for individual DexScreener tokens
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
        if (this.coinGeckoTimer) clearTimeout(this.coinGeckoTimer);
        if (this.dexScreenerTimer) clearInterval(this.dexScreenerTimer);
        this.coinGeckoTimer = null;
        this.dexScreenerTimer = null;
        this.isRunning = false;
        this.consecutiveFailures = 0;
        console.log('[PriceService] Stopped polling.');
    }
}

// Export with the SAME name so existing imports don't break
export const websocketService = new PricePollingService();
