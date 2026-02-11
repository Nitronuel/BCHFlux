import { create } from 'zustand';
import { fetchCoinMetadata, type MarketCoin } from '../services/api';
import { fetchDexScreenerTrends } from '../services/dexScreener';
import { getCachedMarketData, setCachedMarketData, updateCachedPrices } from '../services/metadataCache';
import { websocketService } from '../services/websocket';

// Default coins to track - BCH first as requested
const DEFAULT_COINS = [
    'bitcoin-cash',
    'bitcoin',
    'ethereum',
    'solana',
];

interface MarketState {
    markets: MarketCoin[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;
    isLive: boolean;

    // Actions
    initializeMarkets: () => Promise<void>;
    updateMarketPrice: (coinId: string, price: number) => void;
    addCustomToken: (token: MarketCoin) => void;
    removeCustomToken: (id: string) => void;
    moveMarket: (id: string, direction: 'up' | 'down') => void;
    startLiveUpdates: () => () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
    markets: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    isLive: false,

    /**
     * Initialize markets using cache-first strategy:
     * 1. Try to load FULL market data from cache (including prices)
     * 2. If cache miss, fetch from CoinGecko and cache it
     * 3. WebSocket will update prices in real-time
     */
    initializeMarkets: async () => {
        set({ isLoading: true, error: null });

        try {
            // Load custom tokens from local storage
            let customTokens: MarketCoin[] = JSON.parse(localStorage.getItem('custom_tokens') || '[]');
            const marketOrder: string[] = JSON.parse(localStorage.getItem('market_order') || '[]');
            const hiddenTokens: string[] = JSON.parse(localStorage.getItem('hidden_tokens') || '[]');

            // --- DEV: Inject Test Solana Token (Popcat) if not present ---
            const testTokenId = 'popcat-sol';
            if (!customTokens.some(t => t.id === testTokenId)) {
                const popcatToken: MarketCoin = {
                    id: testTokenId,
                    symbol: 'popcat',
                    name: 'Popcat (SOL)',
                    image: 'https://assets.coingecko.com/coins/images/33739/standard/popcat.png?1702958288',
                    current_price: 0.45, // Mock start price
                    price_change_percentage_24h: 12.5,
                    high_24h: 0.50,
                    low_24h: 0.40,
                    total_volume: 5000000,
                    market_cap: 450000000,
                    chainId: 'solana',
                    pairAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'
                };
                customTokens.push(popcatToken);
                localStorage.setItem('custom_tokens', JSON.stringify(customTokens));
                console.log('[MarketStore] Injected Test Token: Popcat (SOL)');
            }

            // Step 1: Check cache for full market data
            const cachedData = getCachedMarketData();

            let markets: MarketCoin[];

            if (cachedData && cachedData.length > 0) {
                // Cache hit! Use cached data (includes prices from last session)
                console.log('[MarketStore] Using cached market data');
                markets = cachedData;
            } else {
                // Cache miss - fetch from CoinGecko (only happens once per 24h or on first load)
                console.log('[MarketStore] Cache miss, fetching from CoinGecko & DexScreener...');

                // Fetch Core Coins (CoinGecko) and Trending (DexScreener) in parallel
                const [coreData, trendData] = await Promise.all([
                    fetchCoinMetadata(DEFAULT_COINS),
                    fetchDexScreenerTrends()
                ]);

                // Merge: Core first, then Trends
                const mergedData = [...coreData, ...trendData];

                // Cache the full market data
                setCachedMarketData(mergedData);

                markets = mergedData;
            }

            // Filter out hidden tokens
            markets = markets.filter(m => !hiddenTokens.includes(m.id));

            // Merge with custom tokens
            // Avoid duplicates by filtering out custom tokens that might already be in standard list
            const uniqueMarkets = [...markets];
            customTokens.forEach(token => {
                // Only add if not already in list AND not hidden (unless manually re-added, handled in addCustomToken)
                if (!uniqueMarkets.some(m => m.id === token.id)) {
                    uniqueMarkets.push(token);
                }
            });

            // Apply Sort Order if exists
            let sorted: MarketCoin[];
            if (marketOrder.length > 0) {
                // Create a map for O(1) lookup of order index
                const orderMap = new Map(marketOrder.map((id, index) => [id, index]));

                sorted = uniqueMarkets.sort((a, b) => {
                    const indexA = orderMap.get(a.id);
                    const indexB = orderMap.get(b.id);

                    // If both have explicit order, sort by that
                    if (indexA !== undefined && indexB !== undefined) return indexA - indexB;

                    // If only A has order, it comes first
                    if (indexA !== undefined) return -1;

                    // If only B has order, it comes first
                    if (indexB !== undefined) return 1;

                    // Fallback to default sort: BCH first, then others
                    if (a.id === 'bitcoin-cash') return -1;
                    if (b.id === 'bitcoin-cash') return 1;
                    return 0;
                });
            } else {
                // Default Sort: BCH first
                sorted = uniqueMarkets.sort((a, b) => {
                    if (a.id === 'bitcoin-cash') return -1;
                    if (b.id === 'bitcoin-cash') return 1;
                    return 0;
                });
            }

            set({
                markets: sorted,
                isLoading: false,
                lastUpdated: Date.now(),
            });

            console.log('[MarketStore] Initialized with', sorted.length, 'coins');
        } catch (err) {
            console.error('[MarketStore] Failed to initialize:', err);

            // Try to use stale cache as fallback
            const staleData = getCachedMarketData();
            if (staleData && staleData.length > 0) {
                console.log('[MarketStore] Using stale cache as fallback');
                set({
                    markets: staleData,
                    isLoading: false,
                    error: 'Using cached data (API unavailable)',
                });
            } else {
                set({
                    isLoading: false,
                    error: err instanceof Error ? err.message : 'Failed to load markets',
                });
            }
        }
    },

    addCustomToken: (token: MarketCoin) => {
        const { markets } = get();

        // Prevent duplicates
        if (markets.some(m => m.id === token.id)) {
            console.warn('[MarketStore] Token already exists:', token.id);
            return;
        }

        const updatedMarkets = [...markets, token];
        set({ markets: updatedMarkets });

        // Persist Custom Token
        const customTokens: MarketCoin[] = JSON.parse(localStorage.getItem('custom_tokens') || '[]');
        if (!customTokens.some(t => t.id === token.id)) {
            customTokens.push(token);
            localStorage.setItem('custom_tokens', JSON.stringify(customTokens));
        }

        // Persist Order (add to end)
        const marketOrder = updatedMarkets.map(m => m.id);
        localStorage.setItem('market_order', JSON.stringify(marketOrder));

        // Remove from hidden tokens if it was there (re-adding a previously hidden token)
        const hiddenTokens: string[] = JSON.parse(localStorage.getItem('hidden_tokens') || '[]');
        if (hiddenTokens.includes(token.id)) {
            const updatedHidden = hiddenTokens.filter(id => id !== token.id);
            localStorage.setItem('hidden_tokens', JSON.stringify(updatedHidden));
        }
    },

    removeCustomToken: (id: string) => {
        const { markets } = get();

        // Remove from state
        const updatedMarkets = markets.filter(m => m.id !== id);
        set({ markets: updatedMarkets });

        // Update Persistence: Custom Tokens
        const customTokens: MarketCoin[] = JSON.parse(localStorage.getItem('custom_tokens') || '[]');
        const wasCustom = customTokens.some(t => t.id === id);

        if (wasCustom) {
            const updatedCustomTokens = customTokens.filter(t => t.id !== id);
            localStorage.setItem('custom_tokens', JSON.stringify(updatedCustomTokens));
        } else {
            // If it wasn't a custom token (e.g. it was Trending or Core), add to hidden_tokens so it doesn't come back
            const hiddenTokens: string[] = JSON.parse(localStorage.getItem('hidden_tokens') || '[]');
            if (!hiddenTokens.includes(id)) {
                hiddenTokens.push(id);
                localStorage.setItem('hidden_tokens', JSON.stringify(hiddenTokens));
            }
        }

        // Update Persistence: Market Order
        const marketOrder = updatedMarkets.map(m => m.id);
        localStorage.setItem('market_order', JSON.stringify(marketOrder));
    },

    /**
     * Update a single market's price from WebSocket
     * CoinCap only sends current price, so we calculate % change from cached initial price
     */
    updateMarketPrice: (coinId: string, newPrice: number) => {
        const { markets } = get();
        const updatedMarkets = markets.map(coin => {
            if (coin.id === coinId) {
                // Calculate 24h change based on the initial cached price
                const change24h = coin.price_change_percentage_24h;

                return {
                    ...coin,
                    current_price: newPrice,
                    price_change_percentage_24h: change24h,
                };
            }
            return coin;
        });

        // Also update cache so next page load has fresh prices
        updateCachedPrices(coinId, newPrice, updatedMarkets.find(m => m.id === coinId)?.price_change_percentage_24h ?? 0);

        set({
            markets: updatedMarkets,
            lastUpdated: Date.now(),
            isLive: true,
        });
    },

    moveMarket: (id: string, direction: 'up' | 'down') => {
        const { markets } = get();
        const index = markets.findIndex(m => m.id === id);
        if (index === -1) return;

        const newMarkets = [...markets];
        if (direction === 'up' && index > 0) {
            [newMarkets[index], newMarkets[index - 1]] = [newMarkets[index - 1], newMarkets[index]];
        } else if (direction === 'down' && index < newMarkets.length - 1) {
            [newMarkets[index], newMarkets[index + 1]] = [newMarkets[index + 1], newMarkets[index]];
        }

        set({ markets: newMarkets });

        // Persist new order
        localStorage.setItem('market_order', JSON.stringify(newMarkets.map(m => m.id)));
    },

    /**
     * Start WebSocket subscription for live price updates
     */
    startLiveUpdates: () => {
        console.log('[MarketStore] Starting live price updates...');
        const unsubscribe = websocketService.subscribe((coinId, price) => {
            get().updateMarketPrice(coinId, price);
        });

        set({ isLive: true });

        return () => {
            console.log('[MarketStore] Stopping live updates');
            unsubscribe();
            set({ isLive: false });
        };
    },
}));
