// CoinCap WebSocket service for real-time price updates
// CoinCap is widely accessible and provides reliable real-time prices

type PriceCallback = (coinId: string, price: number, change24h: number) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private callbacks: PriceCallback[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 3000;
    private isConnecting = false;
    private messageCount = 0;

    // Assets to track (CoinCap IDs match CoinGecko IDs for these)
    private assets = ['bitcoin-cash', 'bitcoin', 'ethereum', 'solana'];

    connect() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;
        const wsUrl = `wss://ws.coincap.io/prices?assets=${this.assets.join(',')}`;

        console.log('[WebSocket] Connecting to CoinCap...');

        try {
            this.ws = new WebSocket(wsUrl);
        } catch (err) {
            console.error('[WebSocket] Failed to create WebSocket:', err);
            this.isConnecting = false;
            return;
        }

        this.ws.onopen = () => {
            console.log('[WebSocket] ✅ Connected to CoinCap!');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.messageCount = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                // CoinCap sends: { "bitcoin": "43250.12", "ethereum": "2310.45", ... }
                const prices = JSON.parse(event.data);
                this.messageCount++;

                // Log first few messages for debugging
                if (this.messageCount <= 2) {
                    console.log(`[WebSocket] Prices:`, prices);
                }

                // Process each price update
                Object.entries(prices).forEach(([coinId, priceStr]) => {
                    const price = parseFloat(priceStr as string);
                    if (!isNaN(price)) {
                        // Log every 100th update to show it's working
                        if (this.messageCount % 100 === 0) {
                            console.log(`[WebSocket] 📊 ${coinId}: $${price.toFixed(2)}`);
                        }
                        this.callbacks.forEach(cb => cb(coinId, price, 0));
                    }
                });
            } catch (err) {
                console.error('[WebSocket] Parse error:', err);
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
            this.isConnecting = false;
        };

        this.ws.onclose = (event) => {
            console.log(`[WebSocket] Connection closed (Code: ${event.code}, Reason: ${event.reason || 'No reason'})`);
            this.isConnecting = false;
            this.attemptReconnect();
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay / 1000}s (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error('[WebSocket] Max reconnect attempts reached. Using cached prices.');
        }
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

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.callbacks = [];
    }

    getStatus() {
        return {
            provider: 'coincap',
            connected: this.ws?.readyState === WebSocket.OPEN,
            connecting: this.isConnecting,
            callbacks: this.callbacks.length,
            messageCount: this.messageCount,
        };
    }
}

// Singleton instance
export const websocketService = new WebSocketService();

// Expose for debugging in console: wsDebug()
if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).wsDebug = () => websocketService.getStatus();
}
