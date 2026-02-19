import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type UTCTimestamp } from 'lightweight-charts';
import { fetchOHLCData, fetchDexScreenerOHLC, generateMockOHLC, type OHLCData } from '../../services/chartData';
import { useMarketStore } from '../../store/marketStore';

interface ChartComponentProps {
    coinId?: string;
    timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    currChainId?: string;
    pairAddress?: string;
}

// Timeframe to seconds mapping
const TIMEFRAME_SECONDS: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
};

const ChartComponent: React.FC<ChartComponentProps> = ({
    coinId = 'bitcoin-cash',
    timeframe = '1m',
    currChainId,
    pairAddress
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const priceLineRef = useRef<ISeriesApi<'Line'> | null>(null);
    const lastCandleRef = useRef<OHLCData | null>(null);
    const candleDataRef = useRef<OHLCData[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

    // Get live price from marketStore
    const markets = useMarketStore(state => state.markets);
    const currentMarket = markets.find(m => m.id === coinId);
    const livePrice = currentMarket?.current_price;
    // Keep track of live price in ref to avoid re-creating loadChartData on every tick
    const livePriceRef = useRef(livePrice);
    useEffect(() => {
        livePriceRef.current = livePrice;
    }, [livePrice]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#181A20' },
                textColor: '#848E9C',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 400,
            grid: {
                vertLines: { color: '#2B3139' },
                horzLines: { color: '#2B3139' },
            },
            timeScale: {
                borderColor: '#2B3139',
                timeVisible: true,
                secondsVisible: true,
            },
            rightPriceScale: {
                borderColor: '#2B3139',
            },
            crosshair: {
                mode: 1,
            },
        });

        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#0ECB81',
            downColor: '#F6465D',
            borderDownColor: '#F6465D',
            borderUpColor: '#0ECB81',
            wickDownColor: '#F6465D',
            wickUpColor: '#0ECB81',
        });
        candleSeriesRef.current = candleSeries;

        // Add a line series for the current price level
        const priceLine = chart.addSeries(LineSeries, {
            color: '#F0B90B',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            priceLineVisible: false,
            lastValueVisible: true,
        });
        priceLineRef.current = priceLine;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight || 400,
                });
            }
        };
        window.addEventListener('resize', handleResize);

        // NOTE: Data loading is handled by separate effect below

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            priceLineRef.current = null;
        };
    }, [coinId]);

    // Load historical candle data
    const loadChartData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // CoinGecko OHLC: days=1 returns 5-min candles, days=7 returns hourly
            const days = selectedTimeframe === '1m' || selectedTimeframe === '5m' ? 1 :
                selectedTimeframe === '15m' || selectedTimeframe === '1h' ? 7 : 30;

            let data: OHLCData[];

            if (currChainId && pairAddress) {
                // Fetch from DexScreener via Proxy
                data = await fetchDexScreenerOHLC(currChainId, pairAddress, selectedTimeframe);
            } else {
                // Fetch from CoinGecko
                data = await fetchOHLCData(coinId, days);
            }

            if (candleSeriesRef.current && data.length > 0) {
                candleDataRef.current = data;
                const chartData: CandlestickData[] = data.map(d => ({
                    time: d.time as UTCTimestamp,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }));

                candleSeriesRef.current.setData(chartData);
                lastCandleRef.current = data[data.length - 1];
                chartRef.current?.timeScale().fitContent();
            }
        } catch (err) {
            console.error('[Chart] Failed to load data:', err);
            setError('Demo mode');

            // Generate mock data based on current price
            // Use ref to avoid dependency on livePrice
            const mockData = generateMockOHLC(livePriceRef.current || 500, 100);
            candleDataRef.current = mockData;

            if (candleSeriesRef.current) {
                const chartData: CandlestickData[] = mockData.map(d => ({
                    time: d.time as UTCTimestamp,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }));
                candleSeriesRef.current.setData(chartData);
                lastCandleRef.current = mockData[mockData.length - 1];
            }
        } finally {
            setIsLoading(false);
        }
    }, [coinId, selectedTimeframe]);

    // Update chart with live price (real-time tick updates)
    useEffect(() => {
        if (!livePrice || !candleSeriesRef.current || !lastCandleRef.current) return;

        const candleInterval = TIMEFRAME_SECONDS[selectedTimeframe];
        const now = Math.floor(Date.now() / 1000);
        const currentCandleTime = Math.floor(now / candleInterval) * candleInterval;
        const lastCandle = lastCandleRef.current;

        if (lastCandle.time < currentCandleTime) {
            // Create a new candle
            const newCandle: OHLCData = {
                time: currentCandleTime,
                open: lastCandle.close,
                high: livePrice,
                low: livePrice,
                close: livePrice,
            };

            candleSeriesRef.current.update({
                time: currentCandleTime as UTCTimestamp,
                open: newCandle.open,
                high: newCandle.high,
                low: newCandle.low,
                close: newCandle.close,
            });

            lastCandleRef.current = newCandle;
            candleDataRef.current.push(newCandle);
        } else {
            // Update the current candle
            const updatedCandle: OHLCData = {
                time: lastCandle.time,
                open: lastCandle.open,
                high: Math.max(lastCandle.high, livePrice),
                low: Math.min(lastCandle.low, livePrice),
                close: livePrice,
            };

            candleSeriesRef.current.update({
                time: lastCandle.time as UTCTimestamp,
                open: updatedCandle.open,
                high: updatedCandle.high,
                low: updatedCandle.low,
                close: updatedCandle.close,
            });

            lastCandleRef.current = updatedCandle;
        }

        // Update price line to show current price
        if (priceLineRef.current) {
            priceLineRef.current.update({
                time: now as UTCTimestamp,
                value: livePrice,
            });
        }
    }, [livePrice, selectedTimeframe]);

    // Reload data when timeframe changes
    useEffect(() => {
        if (chartRef.current) {
            loadChartData();
        }
    }, [selectedTimeframe, loadChartData]);

    const handleTimeframeChange = (tf: string) => {
        setSelectedTimeframe(tf as typeof selectedTimeframe);
    };

    return (
        <div className="w-full h-full relative flex flex-col">
            {/* Timeframe selector */}
            <div className="absolute top-2 left-2 z-10 flex gap-1 bg-surface/80 backdrop-blur-sm p-1 rounded">
                {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                    <button
                        key={tf}
                        onClick={() => handleTimeframeChange(tf)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${selectedTimeframe === tf
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-primary hover:bg-hover'
                            }`}
                    >
                        {tf.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <div className="flex items-center gap-2 text-text-secondary">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <span>Loading chart...</span>
                    </div>
                </div>
            )}

            {/* Status indicators */}
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                {error && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded">
                        {error}
                    </span>
                )}
                {livePrice && !isLoading && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live</span>
                    </div>
                )}
            </div>

            {/* Chart container */}
            <div ref={chartContainerRef} className="w-full flex-1 min-h-[300px]" />
        </div>
    );
};

export default ChartComponent;
