import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ProxyService {
    private readonly DEXSCREENER_BASE = 'https://api.dexscreener.com/latest/dex';
    private readonly DEXSCREENER_IO_BASE = 'https://io.dexscreener.com';
    private readonly COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

    /**
     * Fetch pair data from DexScreener
     */
    async getDexScreenerPair(chainId: string, pairAddress: string) {
        try {
            const url = `${this.DEXSCREENER_BASE}/pairs/${chainId}/${pairAddress}`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener pair fetch error:', error);
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
        try {
            const url = `${this.DEXSCREENER_BASE}/tokens/${tokenAddress}`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener token fetch error:', error);
            throw new HttpException(
                'Failed to fetch token data from DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Fetch prices from CoinGecko
     */
    async getCoinGeckoPrices(coinIds: string[], vsCurrency = 'usd') {
        try {
            const ids = coinIds.join(',');
            const url = `${this.COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] CoinGecko price fetch error:', error);
            throw new HttpException(
                'Failed to fetch prices from CoinGecko',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    /**
     * Fetch market data from CoinGecko
     */
    async getCoinGeckoMarkets(coinIds: string[]) {
        try {
            const ids = coinIds.join(',');
            const url = `${this.COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] CoinGecko market fetch error:', error);
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
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener search error:', error);
            throw new HttpException(
                'Failed to search DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
    /**
     * Fetch chart bars from DexScreener IO API
     * URL pattern: /dex/chart/amm/v3/{dexId}/bars/{chainId}/{pairAddress}
     */
    async getDexScreenerBars(dexId: string, chainId: string, pairAddress: string, from: number, to: number, res: string, cb: string) {
        try {
            const url = `${this.DEXSCREENER_IO_BASE}/dex/chart/amm/v3/${dexId}/bars/${chainId}/${pairAddress}?start=${from}&end=${to}&res=${res}&cb=${cb}`;

            // DexScreener IO requires Origin/Referer to be set to dexscreener.com
            const response = await axios.get(url, {
                headers: {
                    'Origin': 'https://dexscreener.com',
                    'Referer': 'https://dexscreener.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            return response.data;
        } catch (error) {
            console.error('[ProxyService] DexScreener bars fetch error:', error);
            throw new HttpException(
                'Failed to fetch chart bars from DexScreener',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
}
