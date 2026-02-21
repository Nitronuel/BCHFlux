import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

// Simple in-memory cache to avoid rate limiting
interface CacheEntry {
    data: any;
    timestamp: number;
}

@Injectable()
export class ProxyService {
    private readonly DEXSCREENER_BASE = 'https://api.dexscreener.com/latest/dex';
    private readonly DEXSCREENER_IO_BASE = 'https://io.dexscreener.com';
    private readonly COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

    // Cache: key -> { data, timestamp }
    private cache = new Map<string, CacheEntry>();
    private readonly PRICE_CACHE_TTL = 30000;   // 30 seconds for prices
    private readonly MARKET_CACHE_TTL = 60000;   // 60 seconds for market data
    private readonly DEX_CACHE_TTL = 15000;      // 15 seconds for DexScreener

    /**
     * Get from cache if fresh, otherwise null
     */
    private getFromCache(key: string, ttl: number): any | null {
        const entry = this.cache.get(key);
        if (entry && (Date.now() - entry.timestamp) < ttl) {
            return entry.data;
        }
        return null;
    }

    /**
     * Store in cache
     */
    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Fetch pair data from DexScreener
     */
    async getDexScreenerPair(chainId: string, pairAddress: string) {
        const cacheKey = `dex-pair:${chainId}:${pairAddress}`;
        const cached = this.getFromCache(cacheKey, this.DEX_CACHE_TTL);
        if (cached) return cached;

        try {
            const url = `${this.DEXSCREENER_BASE}/pairs/${chainId}/${pairAddress}`;
            const response = await axios.get(url, { timeout: 10000 });
            this.setCache(cacheKey, response.data);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener pair fetch error:', (error as Error).message);
            // Return stale cache if available
            const stale = this.cache.get(cacheKey);
            if (stale) return stale.data;
            throw new HttpException(
                'Failed to fetch pair data from DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Fetch token data from DexScreener by token address
     */
    async getDexScreenerToken(tokenAddress: string) {
        const cacheKey = `dex-token:${tokenAddress}`;
        const cached = this.getFromCache(cacheKey, this.DEX_CACHE_TTL);
        if (cached) return cached;

        try {
            const url = `${this.DEXSCREENER_BASE}/tokens/${tokenAddress}`;
            const response = await axios.get(url, { timeout: 10000 });
            this.setCache(cacheKey, response.data);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener token fetch error:', (error as Error).message);
            const stale = this.cache.get(cacheKey);
            if (stale) return stale.data;
            throw new HttpException(
                'Failed to fetch token data from DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Fetch prices from CoinGecko — cached for 30 seconds
     */
    async getCoinGeckoPrices(coinIds: string[], vsCurrency = 'usd') {
        const ids = coinIds.join(',');
        const cacheKey = `cg-prices:${ids}:${vsCurrency}`;
        const cached = this.getFromCache(cacheKey, this.PRICE_CACHE_TTL);
        if (cached) return cached;

        try {
            const url = `${this.COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
            const response = await axios.get(url, { timeout: 10000 });
            this.setCache(cacheKey, response.data);
            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 429) {
                console.warn('[ProxyService] CoinGecko rate limited (429), using stale cache');
            } else {
                console.error('[ProxyService] CoinGecko price fetch error:', error.message);
            }
            // Return stale cache if available instead of 502
            const stale = this.cache.get(cacheKey);
            if (stale) return stale.data;
            throw new HttpException(
                'Failed to fetch prices from CoinGecko',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Fetch market data from CoinGecko — cached for 60 seconds
     */
    async getCoinGeckoMarkets(coinIds: string[]) {
        const ids = coinIds.join(',');
        const cacheKey = `cg-markets:${ids}`;
        const cached = this.getFromCache(cacheKey, this.MARKET_CACHE_TTL);
        if (cached) return cached;

        try {
            const url = `${this.COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`;
            const response = await axios.get(url, { timeout: 10000 });
            this.setCache(cacheKey, response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ProxyService] CoinGecko market fetch error:', error.message);
            const stale = this.cache.get(cacheKey);
            if (stale) return stale.data;
            throw new HttpException(
                'Failed to fetch market data from CoinGecko',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Search DexScreener for tokens
     */
    async searchDexScreener(query: string) {
        try {
            const url = `${this.DEXSCREENER_BASE}/search?q=${encodeURIComponent(query)}`;
            const response = await axios.get(url, { timeout: 10000 });
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener search error:', (error as Error).message);
            throw new HttpException(
                'Failed to search DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Fetch chart bars from DexScreener IO API
     */
    async getDexScreenerBars(dexId: string, chainId: string, pairAddress: string, from: number, to: number, res: string, cb: string) {
        try {
            const url = `${this.DEXSCREENER_IO_BASE}/dex/chart/amm/v3/${dexId}/bars/${chainId}/${pairAddress}?start=${from}&end=${to}&res=${res}&cb=${cb}`;

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'Origin': 'https://dexscreener.com',
                    'Referer': 'https://dexscreener.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener bars fetch error:', (error as Error).message);
            throw new HttpException(
                'Failed to fetch chart bars from DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
}
