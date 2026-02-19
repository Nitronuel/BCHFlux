import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller('proxy')
export class ProxyController {
    constructor(private readonly proxyService: ProxyService) { }

    /**
     * GET /api/proxy/dexscreener/pairs/:chain/:address
     * Proxy DexScreener pair data
     */
    @Get('dexscreener/pairs/:chain/:address')
    async getDexScreenerPair(
        @Param('chain') chain: string,
        @Param('address') address: string,
    ) {
        return this.proxyService.getDexScreenerPair(chain, address);
    }

    /**
     * GET /api/proxy/dexscreener/tokens/:address
     * Proxy DexScreener token lookup
     */
    @Get('dexscreener/tokens/:address')
    async getDexScreenerToken(@Param('address') address: string) {
        return this.proxyService.getDexScreenerToken(address);
    }

    /**
     * GET /api/proxy/dexscreener/search?q=...
     * Search DexScreener for tokens
     */
    @Get('dexscreener/search')
    async searchDexScreener(@Query('q') query: string) {
        return this.proxyService.searchDexScreener(query);
    }

    /**
     * GET /api/proxy/coingecko/prices?ids=bitcoin,ethereum&vs_currency=usd
     * Proxy CoinGecko price data
     */
    @Get('coingecko/prices')
    async getCoinGeckoPrices(
        @Query('ids') ids: string,
        @Query('vs_currency') vsCurrency: string = 'usd',
    ) {
        const coinIds = ids ? ids.split(',') : [];
        return this.proxyService.getCoinGeckoPrices(coinIds, vsCurrency);
    }

    /**
     * GET /api/proxy/coingecko/markets?ids=bitcoin,ethereum
     * Proxy CoinGecko market data
     */
    @Get('coingecko/markets')
    async getCoinGeckoMarkets(@Query('ids') ids: string) {
        const coinIds = ids ? ids.split(',') : [];
        return this.proxyService.getCoinGeckoMarkets(coinIds);
    }
    /**
     * GET /api/proxy/dexscreener/bars/:dexId/:chainId/:pairAddress
     * Proxy DexScreener chart bars
     */
    @Get('dexscreener/bars/:dexId/:chainId/:pairAddress')
    async getDexScreenerBars(
        @Param('dexId') dexId: string,
        @Param('chainId') chainId: string,
        @Param('pairAddress') pairAddress: string,
        @Query('from') from: number,
        @Query('to') to: number,
        @Query('res') res: string,
        @Query('cb') cb: string,
    ) {
        return this.proxyService.getDexScreenerBars(dexId, chainId, pairAddress, from, to, res, cb);
    }
}
