import axios, { AxiosError } from 'axios';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export interface CoinGeckoPrice {
    usd: number;
    usd_24h_change: number;
}

export interface PriceData {
    [coinId: string]: CoinGeckoPrice;
}

export interface MarketCoin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    price_change_percentage_24h: number;
    high_24h: number;
    low_24h: number;
    total_volume: number;
    market_cap: number;
    chainId?: string;
    pairAddress?: string;
}

/**
 * Helper function to delay execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrapper for axios requests with retry logic for rate limiting
 */
async function fetchWithRetry<T>(url: string, retries = MAX_RETRIES): Promise<T> {
    try {
        const response = await axios.get<T>(url);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;

        // Check if rate limited (429) or server error (5xx)
        if (axiosError.response?.status === 429 || (axiosError.response?.status ?? 0) >= 500) {
            if (retries > 0) {
                console.warn(`[API] Rate limited or server error, retrying in ${RETRY_DELAY}ms... (${retries} retries left)`);
                await delay(RETRY_DELAY);
                return fetchWithRetry<T>(url, retries - 1);
            }
        }

        // Log the error for debugging
        console.error('[API] Request failed:', axiosError.message);
        throw error;
    }
}

/**
 * Fetches ONLY metadata (name, image, market_cap) for coins.
 * Used sparingly - only when cache is empty or expired.
 * @param coinIds - Array of CoinGecko coin IDs
 * @returns Array of coin metadata (not prices - those come from WebSocket)
 */
export async function fetchCoinMetadata(coinIds: string[]): Promise<MarketCoin[]> {
    console.log('[API] Fetching metadata for', coinIds.length, 'coins (will be cached for 24h)');
    const ids = coinIds.join(',');
    const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`;

    return fetchWithRetry<MarketCoin[]>(url);
}

/**
 * Fetches metadata for a SINGLE coin (for custom token additions).
 * @param coinId - CoinGecko coin ID
 * @returns Single coin metadata or null if not found
 */
export async function fetchSingleCoinMetadata(coinId: string): Promise<MarketCoin | null> {
    console.log('[API] Fetching metadata for single coin:', coinId);
    try {
        // Parallel fetch: CoinGecko Metadata + DexScreener Pair Info
        const geckoUrl = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`;

        // We can't query DexScreener by CoinGecko ID directly, but we can search by the symbol/name later
        // or we can try to find the pair if we had the address.
        // Since we only have the ID here (e.g. 'peanut-the-squirrel'), we rely on CoinGecko first.

        const [geckoData] = await Promise.all([
            fetchWithRetry<MarketCoin[]>(geckoUrl)
        ]);

        const coin = geckoData[0];
        if (!coin) return null;

        // NOW, try to find the best pair on DexScreener to get the chart
        // We search DexScreener by the token's symbol (e.g. 'PNUT')
        try {
            const dexUrl = `https://api.dexscreener.com/latest/dex/search?q=${coin.symbol}`;
            const dexResponse = await axios.get(dexUrl);
            const pairs = dexResponse.data.pairs;

            if (pairs && pairs.length > 0) {
                // Find the liquidity pool with the highest volume that matches the symbol
                // Sort by volume
                pairs.sort((a: any, b: any) => b.volume?.h24 - a.volume?.h24);

                const bestPair = pairs[0];
                if (bestPair) {
                    console.log(`[API] Found DexScreener pair for ${coin.symbol}: ${bestPair.chainId}/${bestPair.pairAddress}`);
                    coin.chainId = bestPair.chainId;
                    coin.pairAddress = bestPair.pairAddress;
                }
            }
        } catch (dexErr) {
            console.warn('[API] Failed to fetch DexScreener info for custom token:', dexErr);
            // Non-fatal, just won't have the chart
        }

        return coin;
    } catch {
        console.error('[API] Failed to fetch coin:', coinId);
        return null;
    }
}

/**
 * Searches for coins by name/symbol (for "Add Custom Token" feature)
 * @param query - Search query
 * @returns Array of matching coins
 */
export async function searchCoins(query: string): Promise<{ id: string; symbol: string; name: string; thumb: string }[]> {
    console.log('[API] Searching coins:', query);
    try {
        const url = `${COINGECKO_API_BASE}/search?query=${encodeURIComponent(query)}`;
        const data = await fetchWithRetry<{ coins: { id: string; symbol: string; name: string; thumb: string }[] }>(url);
        return data.coins.slice(0, 10); // Return top 10 results
    } catch {
        console.error('[API] Search failed');
        return [];
    }
}

// Legacy function - kept for backward compatibility but prefer WebSocket for prices
export async function fetchPrices(coinIds: string[]): Promise<PriceData> {
    const ids = coinIds.join(',');
    const url = `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    return fetchWithRetry<PriceData>(url);
}

// Legacy function - now prefer fetchCoinMetadata + WebSocket for prices
export async function fetchMarkets(coinIds: string[]): Promise<MarketCoin[]> {
    return fetchCoinMetadata(coinIds);
}
