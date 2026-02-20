// Hybrid WebSocket Service: Binance (Fastest for Majors) + CoinCap (Fallback for others)
// Binance WS is standard for high-frequency trading of major assets.

type PriceCallback = (coinId: string, price: number, change24h: number) => void;

// Map CoinGecko IDs (used in our app) to Binance Symbols
const ID_TO_SYMBOL: Record<string, string> = {
    'bitcoin-cash': 'bchusdt',
    'bitcoin': 'btcusdt',
    'ethereum': 'ethusdt',
    'solana': 'solusdt',
    'ripple': 'xrpusdt',
    'dogecoin': 'dogeusdt',
    'cardano': 'adausdt',
    'polkadot': 'dotusdt',
    'chainlink': 'linkusdt',
    'litecoin': 'ltcusdt'
};

const SYMBOL_TO_ID = Object.entries(ID_TO_SYMBOL).reduce((acc, [id, symbol]) => {
    acc[symbol] = id;
    return acc;
}, {} as Record<string, string>);

class WebSocketService {
    private binanceWs: WebSocket | null = null;
    // @ts-ignore Reserved for CoinCap integration
    private _coincapWs: WebSocket | null = null;

    private callbacks: PriceCallback[] = [];
    private isConnecting = false;

    // Assets to track on CoinCap (as backup or for non-Binance assets)
    // We'll dynamically update this list based on what the user tracks?
    // For now, let's keep it simple: CoinCap tracks everything else if we needed it.
    // But honestly, for PumpFun/Meme coins, neither Binance nor CoinCap usually has them instantly.
    // They appear on DexScreener.
    // Optimized Strategy: 
    // 1. Binance for Majors.
    // 2. CoinCap for mid-caps.
    // 3. App treats "Custom Tokens" via polling DexScreener (in marketStore/api).

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        this.connectBinance();
        // this.connectCoinCap(); // Optional: Enable if we want mid-cap coverage via WS
    }

    private connectBinance() {
        const symbols = Object.values(ID_TO_SYMBOL).map(s => `${s}@trade`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/ws/${symbols}`;

        console.log('[WebSocket] Connecting to Binance Stream...');

        try {
            this.binanceWs = new WebSocket(wsUrl);

            this.binanceWs.onopen = () => {
                console.log('[WebSocket] ✅ Connected to Binance!');
                this.isConnecting = false;
            };

            this.binanceWs.onmessage = (event) => {
                const data = JSON.parse(event.data);
                // Binance Trade Stream: { e: 'trade', s: 'BCHUSDT', p: '245.50', ... }
                // Stream name format in combined stream: data.stream matches
                // But raw payload `data` has `s` for symbol.

                const symbol = data.s?.toLowerCase();
                const price = parseFloat(data.p);

                if (symbol && SYMBOL_TO_ID[symbol] && !isNaN(price)) {
                    const coinId = SYMBOL_TO_ID[symbol];
                    // Binance doesn't send "24h change" in trade stream, only current price.
                    // We pass 0 for change, store handles it (keeps existing change %).
                    this.notify(coinId, price, 0);
                }
            };

            this.binanceWs.onerror = (err) => console.error('[WebSocket] Binance Error:', err);
            this.binanceWs.onclose = () => {
                console.log('[WebSocket] Binance Closed. Reconnecting...');
                setTimeout(() => this.connectBinance(), 3000);
            };

        } catch (err) {
            console.error('Failed to connect Binance:', err);
        }
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
        };
    }
}

export const websocketService = new WebSocketService();
if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).wsDebug = () => console.log('WebSocket Service Active');
}
