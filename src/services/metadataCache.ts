// Market Data Cache Service
// Caches FULL market data (metadata + initial prices) in localStorage
// Prices are updated live via WebSocket, but cache prevents CoinGecko rate limits

import type { MarketCoin } from './api';

const CACHE_KEY = 'bchflux_market_data_v3'; // Bumped version to force refresh for meme coins
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for metadata
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for prices (fallback if WebSocket fails)

interface CacheEntry {
    data: MarketCoin[];
    timestamp: number;
}

/**
 * Gets cached market data (full data including prices)
 * Returns null if cache is expired or missing
 */
export function getCachedMarketData(): MarketCoin[] | null {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const entry: CacheEntry = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;

        // Metadata is valid for 24h, but we always return data if available
        // WebSocket will update prices in real-time
        if (age > CACHE_DURATION) {
            console.log('[MarketCache] Cache expired (metadata older than 24h)');
            return null;
        }

        console.log('[MarketCache] Using cached market data');
        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Checks if price data is stale (older than 5 minutes)
 * Used to determine if we should show loading state
 */
export function isPriceCacheStale(): boolean {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return true;

        const entry: CacheEntry = JSON.parse(cached);
        return Date.now() - entry.timestamp > PRICE_CACHE_DURATION;
    } catch {
        return true;
    }
}

/**
 * Saves full market data to cache
 */
export function setCachedMarketData(coins: MarketCoin[]): void {
    const entry: CacheEntry = {
        data: coins,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        console.log('[MarketCache] Saved market data for', coins.length, 'coins');
    } catch (e) {
        console.error('[MarketCache] Failed to save:', e);
    }
}

/**
 * Updates prices in cache without fetching from API
 * Called when WebSocket provides new prices
 */
export function updateCachedPrices(coinId: string, price: number, change24h: number): void {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return;

        const entry: CacheEntry = JSON.parse(cached);
        entry.data = entry.data.map(coin => {
            if (coin.id === coinId) {
                return {
                    ...coin,
                    current_price: price,
                    price_change_percentage_24h: change24h,
                };
            }
            return coin;
        });
        entry.timestamp = Date.now();

        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
        // Silently fail - cache update is not critical
    }
}

/**
 * Clears the cache (for debugging or forced refresh)
 */
export function clearMarketCache(): void {
    localStorage.removeItem(CACHE_KEY);
    console.log('[MarketCache] Cache cleared');
}
