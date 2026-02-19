import React, { useEffect, useRef, memo, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface TradingViewChartProps {
    symbol?: string;
    theme?: 'dark' | 'light';
    interval?: string;
    chainId?: string;
    pairAddress?: string;
}

// Map our coin IDs to TradingView symbols
const SYMBOL_MAP: Record<string, string> = {
    'bitcoin-cash': 'COINBASE:BCHUSD',
    'bitcoin': 'COINBASE:BTCUSD',
    'ethereum': 'COINBASE:ETHUSD',
    'solana': 'COINBASE:SOLUSD',
    'bch': 'COINBASE:BCHUSD',
    'btc': 'COINBASE:BTCUSD',
    'eth': 'COINBASE:ETHUSD',
    'sol': 'COINBASE:SOLUSD',
    // Fallbacks just in case chainId/pairAddress are missing for some reason
    'pepe': 'BINANCE:PEPEUSDT',
    'bonk': 'BINANCE:BONKUSDT',
    'wif': 'BINANCE:WIFUSDT',
    'brett': 'BINANCE:BRETTUSDT',
};

const TradingViewChart: React.FC<TradingViewChartProps> = memo(({
    symbol = 'bitcoin-cash',
    theme = 'dark',
    interval = 'D',
    chainId,
    pairAddress
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetContainerRef = useRef<HTMLDivElement | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Handle ESC key to exit fullscreen
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && isFullscreen) {
            setIsFullscreen(false);
        }
    }, [isFullscreen]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Prevent body scroll when fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    useEffect(() => {
        // If we have chainId and pairAddress, we use DexScreener embed instead of TradingView widget
        if (chainId && pairAddress) {
            return;
        }

        if (!containerRef.current) return;

        // Clear previous widget
        if (widgetContainerRef.current) {
            widgetContainerRef.current.remove();
        }

        // Try to get from explicit map, otherwise construct Binance USDT pair
        let tvSymbol = SYMBOL_MAP[symbol.toLowerCase()];

        if (!tvSymbol) {
            // Clean symbol name (e.g. 'bitcoin-cash' -> 'BCH' is hard without mapping, but 'pepe' -> 'PEPE' is easy)
            // Ideally we passed the ticker "BCH" as symbol prop, but we might have passed "bitcoin-cash" ID.
            // If the symbol prop contains hyphens, it's likely an ID.
            // If we don't have a map for it, we might be out of luck unless we have the ticker.
            // Wait, the component receives `symbol` which effectively is used as ID in other places?
            // Let's check usages. In SpotTradePage it passes `symbol={coinId}` which is "bitcoin-cash".
            // We need a robust fallback.

            // If we can't find it, let's try to assume the ID matches the ticker for some new coins (e.g. 'bonk' -> 'BONK')
            // Or better, let's just uppercase it and try BINANCE.
            // Actually, for new coins like 'pepe', 'bonk', 'wif', the ID is usually the ticker or close to it.
            tvSymbol = `BINANCE:${symbol.toUpperCase()}USDT`;
        }

        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container';
        widgetContainer.style.height = '100%';
        widgetContainer.style.width = '100%';

        const widgetDiv = document.createElement('div');
        widgetDiv.id = `tradingview_${Math.random().toString(36).substr(2, 9)}`;
        widgetDiv.style.height = '100%';
        widgetDiv.style.width = '100%';
        widgetContainer.appendChild(widgetDiv);

        containerRef.current.appendChild(widgetContainer);
        widgetContainerRef.current = widgetContainer;

        // Load TradingView script
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            // @ts-expect-error TradingView is loaded globally
            if (typeof TradingView !== 'undefined') {
                // @ts-expect-error TradingView widget
                new TradingView.widget({
                    container_id: widgetDiv.id,
                    symbol: tvSymbol,
                    interval: interval,
                    timezone: 'Etc/UTC',
                    theme: theme,
                    style: '1',
                    locale: 'en',
                    toolbar_bg: '#181A20',
                    enable_publishing: false,
                    allow_symbol_change: true,
                    save_image: true,
                    hide_top_toolbar: false,
                    hide_side_toolbar: false,
                    withdateranges: true,
                    details: true,
                    hotlist: false,
                    calendar: false,
                    show_popup_button: true,
                    popup_width: '1000',
                    popup_height: '650',
                    autosize: true,
                    width: '100%',
                    height: '100%',
                    overrides: {
                        'paneProperties.background': '#181A20',
                        'paneProperties.vertGridProperties.color': '#2B3139',
                        'paneProperties.horzGridProperties.color': '#2B3139',
                        'scalesProperties.textColor': '#848E9C',
                        'mainSeriesProperties.candleStyle.upColor': '#0ECB81',
                        'mainSeriesProperties.candleStyle.downColor': '#F6465D',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#0ECB81',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#F6465D',
                        'mainSeriesProperties.candleStyle.borderUpColor': '#0ECB81',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#F6465D',
                    },
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            if (widgetContainerRef.current) {
                widgetContainerRef.current.remove();
                widgetContainerRef.current = null;
            }
        };
    }, [symbol, theme, interval, chainId, pairAddress]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div
            className={`
                ${isFullscreen
                    ? 'fixed inset-0 z-50 bg-[#181A20] flex flex-col'
                    : 'w-full h-full flex flex-col'
                }
            `}
        >
            {/* Header bar with fullscreen button */}
            <div className="h-8 bg-surface border-b border-border flex items-center justify-end px-2 shrink-0">
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 hover:bg-hover rounded transition-colors flex items-center gap-1.5 text-text-secondary hover:text-text-primary"
                    title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Expand Chart'}
                >
                    {isFullscreen ? (
                        <>
                            <Minimize2 className="w-4 h-4" />
                            <span className="text-xs">Exit</span>
                        </>
                    ) : (
                        <>
                            <Maximize2 className="w-4 h-4" />
                            <span className="text-xs">Fullscreen</span>
                        </>
                    )}
                </button>
            </div>

            {/* ESC hint when fullscreen */}
            {isFullscreen && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-surface/90 border border-border rounded-md text-xs text-text-secondary">
                    Press <kbd className="px-1.5 py-0.5 bg-background rounded border border-border mx-1">ESC</kbd> to exit fullscreen
                </div>
            )}

            {/* Chart container */}
            <div className="flex-1 w-full bg-[#181A20] relative">
                {chainId && pairAddress ? (() => {
                    // Map chainId to GeckoTerminal format
                    const getGeckoNetwork = (id: string) => {
                        const map: Record<string, string> = {
                            'ethereum': 'eth',
                            'binance-smart-chain': 'bsc',
                            'arbitrum-one': 'arbitrum',
                            'polygon-pos': 'polygon',
                            'optimistic-ethereum': 'optimism',
                            'avalanche': 'avax'
                        };
                        return map[id] || id;
                    };
                    const network = getGeckoNetwork(chainId);
                    return (
                        <iframe
                            src={`https://www.geckoterminal.com/${network}/pools/${pairAddress}?embed=1&info=0&swaps=0`}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                border: '0',
                            }}
                            title="GeckoTerminal Chart"
                        />
                    );
                })() : (
                    <div
                        ref={containerRef}
                        className="w-full h-full"
                    />
                )}
            </div>
        </div>
    );
});

TradingViewChart.displayName = 'TradingViewChart';

export default TradingViewChart;
