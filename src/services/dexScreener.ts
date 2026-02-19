import axios from 'axios';
import type { MarketCoin } from './api';

// Use the NestJS backend API to proxy external requests (avoids CORS issues)
// In production, update this to your deployed backend URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const DEXSCREENER_API_BASE = `${API_BASE}/api/proxy/dexscreener`;

// "Hot" Token Pair Addresses for the Demo
// These are LP pair addresses (not token addresses) for reliable chart data
// Format: { tokenAddress, chainId, pairAddress }
const TRENDING_PAIRS = [
    {
        tokenAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        chainId: 'ethereum',
        pairAddress: '0xa43fe16908251ee70ef74718545e4fe6c5ccec9f' // PEPE/WETH on Uniswap
    },
    {
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        chainId: 'solana',
        pairAddress: 'BjZKz1z4UMjQd3C3ocsU1rGXpwAKo3CJqs7PKjBeByVD' // BONK/SOL on Raydium
    },
    {
        tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopKMD9WDTdLi2Kh',
        chainId: 'solana',
        pairAddress: 'EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx' // WIF/SOL on Raydium
    },
    {
        tokenAddress: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
        chainId: 'base',
        pairAddress: '0x76bf0abd20f1e0155ce40a62615a90a709a6c3d8' // BRETT/WETH on Base
    },
];

export interface DexScreenerPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
        address: string;
        name: string;
        symbol: string;
    };
    priceUsd: string;
    priceChange: {
        h24: number;
    };
    volume: {
        h24: number;
    };
    liquidity?: {
        usd?: number;
    };
    fdv?: number;
    info?: {
        imageUrl?: string;
    };
}

export const fetchDexScreenerTrends = async (): Promise<MarketCoin[]> => {
    try {
        const results: MarketCoin[] = [];

        // Fetch each pair individually using the /pairs endpoint
        for (const pairInfo of TRENDING_PAIRS) {
            try {
                const url = `${DEXSCREENER_API_BASE}/pairs/${pairInfo.chainId}/${pairInfo.pairAddress}`;
                const response = await axios.get<{ pair: DexScreenerPair }>(url);
                const pair = response.data.pair;

                if (pair) {
                    results.push({
                        id: pair.baseToken.symbol.toLowerCase(),
                        symbol: pair.baseToken.symbol.toLowerCase(),
                        name: pair.baseToken.name,
                        image: pair.info?.imageUrl || `https://ui-avatars.com/api/?name=${pair.baseToken.symbol}&background=random`,
                        current_price: parseFloat(pair.priceUsd),
                        price_change_percentage_24h: pair.priceChange?.h24 || 0,
                        high_24h: 0,
                        low_24h: 0,
                        total_volume: pair.volume?.h24 || 0,
                        market_cap: pair.fdv || 0,
                        chainId: pairInfo.chainId, // Use our known chainId
                        pairAddress: pairInfo.pairAddress, // Use our known pairAddress
                    });
                }
            } catch (pairError) {
                console.warn(`[DexScreener] Failed to fetch pair ${pairInfo.pairAddress}:`, pairError);
            }
        }

        return results;

    } catch (error) {
        console.error('[DexScreener] Failed to fetch trends:', error);
        return [];
    }
};

export const fetchTokenByAddress = async (address: string): Promise<MarketCoin | null> => {
    try {
        // Direct call to DexScreener API to ensure we get the latest tokens (PumpFun, etc.)
        // The endpoint is /tokens/{tokenAddress}
        const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
        const response = await axios.get<{ pairs: DexScreenerPair[] }>(url);

        const pairs = response.data.pairs;
        if (!pairs || pairs.length === 0) return null;

        // Preferred quote tokens (these pairs usually have chart data)
        const preferredQuotes = ['SOL', 'WSOL', 'ETH', 'WETH', 'BNB', 'WBNB'];

        // First, try to find a pair with a preferred quote token (SOL pairs usually have chart data)
        let bestPair = pairs.find(pair => {
            // Check if the pair URL or dexId suggests a SOL/ETH pair
            const pairUrl = pair.url?.toLowerCase() || '';
            const dexId = pair.dexId?.toLowerCase() || '';
            return preferredQuotes.some(q =>
                pairUrl.includes(q.toLowerCase()) ||
                dexId.includes('raydium') || // Raydium pairs are usually SOL pairs
                dexId.includes('orca')        // Orca pairs are usually SOL pairs
            );
        });

        // If no preferred pair found, sort by volume and pick the highest
        if (!bestPair) {
            bestPair = pairs.reduce((prev, current) => {
                const prevVol = prev.volume?.h24 || 0;
                const currVol = current.volume?.h24 || 0;
                return currVol > prevVol ? current : prev;
            });
        }

        return {
            id: bestPair.baseToken.symbol.toLowerCase(),
            symbol: bestPair.baseToken.symbol.toLowerCase(),
            name: bestPair.baseToken.name,
            image: bestPair.info?.imageUrl || `https://ui-avatars.com/api/?name=${bestPair.baseToken.symbol}&background=random`,
            current_price: parseFloat(bestPair.priceUsd),
            price_change_percentage_24h: bestPair.priceChange?.h24 || 0,
            high_24h: 0,
            low_24h: 0,
            total_volume: bestPair.volume?.h24 || 0,
            market_cap: bestPair.fdv || 0,
            chainId: bestPair.chainId,
            pairAddress: bestPair.pairAddress,
        };
    } catch (error) {
        console.error('[DexScreener] Failed to fetch token:', error);
        return null;
    }
};
