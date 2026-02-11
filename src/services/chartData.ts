import axios from 'axios';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export interface OHLCData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

// Map our coin IDs to CoinGecko format
const COIN_ID_MAP: Record<string, string> = {
    'bitcoin-cash': 'bitcoin-cash',
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'solana': 'solana',
    'bch': 'bitcoin-cash',
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'sol': 'solana',
};

/**
 * Fetches OHLC (candlestick) data from CoinGecko
 * @param coinId - CoinGecko coin ID
 * @param days - Number of days of data (1, 7, 14, 30, 90, 180, 365, 'max')
 * @returns Array of OHLC data points
 */
export async function fetchOHLCData(coinId: string, days: number = 30): Promise<OHLCData[]> {
    const geckoId = COIN_ID_MAP[coinId.toLowerCase()] || coinId;

    console.log(`[ChartData] Fetching ${days} days of OHLC for ${geckoId}...`);

    try {
        // CoinGecko OHLC endpoint
        const url = `${COINGECKO_API_BASE}/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`;
        const response = await axios.get<number[][]>(url);

        // CoinGecko returns: [[timestamp, open, high, low, close], ...]
        const data: OHLCData[] = response.data.map(candle => ({
            time: Math.floor(candle[0] / 1000), // Convert ms to seconds for lightweight-charts
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
        }));

        console.log(`[ChartData] Loaded ${data.length} candles`);
        return data;
    } catch (error) {
        console.error('[ChartData] Failed to fetch OHLC:', error);
        throw error;
    }
}

/**
 * Generates mock OHLC data as fallback
 */
export function generateMockOHLC(basePrice: number = 500, days: number = 30): OHLCData[] {
    const result: OHLCData[] = [];
    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    let currentPrice = basePrice;

    for (let i = days; i >= 0; i--) {
        const time = now - (i * dayInSeconds);
        const volatility = basePrice * 0.02; // 2% volatility
        const change = (Math.random() - 0.5) * volatility;
        const close = currentPrice + change;
        const high = Math.max(currentPrice, close) + Math.random() * volatility * 0.5;
        const low = Math.min(currentPrice, close) - Math.random() * volatility * 0.5;

        result.push({
            time,
            open: currentPrice,
            high,
            low,
            close,
        });

        currentPrice = close;
    }

    return result;
}
