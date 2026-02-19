import axios from 'axios';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
// Use the NestJS backend API to proxy external requests (avoids CORS issues)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PROXY_BASE = `${API_BASE}/api/proxy`;

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
    'pepe': 'pepe',
    'bonk': 'bonk',
    'wif': 'dogwifhat',
    'brett': 'brett-based',
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
 * Fetches OHLC data for DexScreener pairs via our backend proxy
 */
export async function fetchDexScreenerOHLC(chainId: string, pairAddress: string, timeframe: string): Promise<OHLCData[]> {
    console.log(`[ChartData] Fetching DexScreener bars for ${chainId}/${pairAddress} (${timeframe})...`);

    // Map timeframe to resolution string
    // 1, 5, 15, 60, 240, 1D
    const resMap: Record<string, string> = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '1h': '60',
        '4h': '240',
        '1d': '1D',
    };
    const res = resMap[timeframe] || '60';

    try {
        // Calculate timestamps
        const now = Date.now();
        // DexScreener seems to limit amount of bars, so we request based on timeframe
        // For 1m/5m, request 24h. For larger, request more.
        const days = timeframe === '1m' || timeframe === '5m' ? 1 :
            timeframe === '15m' || timeframe === '1h' ? 7 : 30;

        const from = now - (days * 24 * 60 * 60 * 1000);
        const to = now;

        // Determine Dex ID (usually matches chainId but sometimes different specific to DexScreener internals)
        // For now, assume chainId works as dexId (e.g. 'ethereum', 'solana', 'base')
        const dexId = chainId;

        const url = `${PROXY_BASE}/dexscreener/bars/${dexId}/${chainId}/${pairAddress}?from=${from}&to=${to}&res=${res}&cb=${2}`; // cb param seems optional/random

        const response = await axios.get<{ schemaVersion: string; bars: { timestamp: number; open: string; high: string; low: string; close: string; volume: string }[] }>(url);

        if (!response.data.bars) return [];

        const data: OHLCData[] = response.data.bars.map(bar => ({
            time: Math.floor(bar.timestamp / 1000),
            open: parseFloat(bar.open),
            high: parseFloat(bar.high),
            low: parseFloat(bar.low),
            close: parseFloat(bar.close),
        }));

        // Sort by time
        data.sort((a, b) => a.time - b.time);

        console.log(`[ChartData] Loaded ${data.length} DexScreener bars`);
        return data;
    } catch (error) {
        console.error('[ChartData] Failed to fetch DexScreener bars:', error);
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
