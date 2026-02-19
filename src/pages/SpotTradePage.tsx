import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CandlestickChart } from 'lucide-react';

import MarketSelector from '../components/trading/header/MarketSelector';
import TradingViewChart from '../components/trading/TradingViewChart';
import OrderForm from '../components/trading/forms/OrderForm';
import UserTabs from '../components/trading/UserTabs';
import { useMarketStore } from '../store/marketStore';
import { useUserStore } from '../store/userStore';

const formatVolume = (num: number): string => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
};

const SpotTradePage: React.FC = () => {
    const { pair = 'BCHUSDT' } = useParams();
    const navigate = useNavigate();
    const [isChartVisible, setIsChartVisible] = useState(false);

    const { markets, initializeMarkets } = useMarketStore();
    const { balances } = useUserStore();

    useEffect(() => {
        if (markets.length === 0) {
            initializeMarkets();
        }
    }, [markets.length, initializeMarkets]);

    // Find the current market based on pair
    const quoteSymbol = pair.endsWith('USDT') ? 'USDT' : 'BCH';
    const baseSymbol = pair.replace(quoteSymbol, '').toUpperCase();
    const symbol = baseSymbol.toLowerCase();

    const currentMarket = markets.find(m => m.symbol.toLowerCase() === symbol);
    const coinId = currentMarket?.id || 'bitcoin-cash';

    // Redirect if pair is valid but not found in markets
    useEffect(() => {
        if (markets.length > 0 && !currentMarket) {
            navigate('/trade/spot/BCHUSDT', { replace: true });
        }
    }, [markets.length, currentMarket, navigate]);

    const price = currentMarket?.current_price ?? 0;
    const change = currentMarket?.price_change_percentage_24h ?? 0;
    const high = currentMarket?.high_24h ?? 0;
    const low = currentMarket?.low_24h ?? 0;
    const volume = currentMarket?.total_volume ?? 0;
    const isPositive = change >= 0;

    const handleSelectPair = (newPair: string) => {
        navigate(`/trade/spot/${newPair}`);
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] pb-16 lg:pb-0 bg-background text-text-primary">
            {/* Top Asset Info Bar */}
            <div className="h-16 border-b border-border bg-surface flex items-center px-4 justify-between shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-4 w-full">
                    <MarketSelector
                        currentPair={`${baseSymbol} / ${quoteSymbol}`}
                        variant="spot"
                        onSelectPair={handleSelectPair}
                    />
                    {/* Mobile Price & Change */}
                    <div className="flex flex-col lg:hidden">
                        <span className={`${isPositive ? 'text-buy' : 'text-sell'} font-bold text-sm`}>
                            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`${isPositive ? 'text-buy' : 'text-sell'} text-xs`}>
                            {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-4">
                        <span className={`${isPositive ? 'text-buy' : 'text-sell'} font-medium`}>
                            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-text-secondary flex flex-col">
                            <span>24h Change</span>
                            <span className={isPositive ? 'text-buy' : 'text-sell'}>
                                {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </span>
                        </span>
                        <span className="text-xs text-text-secondary flex flex-col">
                            <span>24h High</span>
                            <span className="text-text-primary">{high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                        <span className="text-xs text-text-secondary flex flex-col">
                            <span>24h Low</span>
                            <span className="text-text-primary">{low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                        <span className="text-xs text-text-secondary flex flex-col">
                            <span>24h Volume</span>
                            <span className="text-text-primary">${formatVolume(volume)}</span>
                        </span>
                    </div>
                </div>
                {/* Mobile Chart Toggle */}
                <button
                    className="lg:hidden p-2 text-text-secondary hover:text-primary"
                    onClick={() => setIsChartVisible(!isChartVisible)}
                >
                    <CandlestickChart className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Chart Overlay */}
            {isChartVisible && (
                <div className="lg:hidden h-[400px] bg-surface border-b border-border">
                    <TradingViewChart
                        symbol={coinId}
                        chainId={currentMarket?.chainId}
                        pairAddress={currentMarket?.pairAddress}
                    />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-128px)] lg:min-h-[600px]">

                {/* Mobile: OrderForm Full Width */}
                <div className="flex lg:hidden flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto">
                        <OrderForm
                            variant="spot"
                            currentPrice={price}
                            baseSymbol={baseSymbol}
                            quoteSymbol={quoteSymbol}
                            chainId={currentMarket?.chainId}
                        />
                    </div>
                </div>

                {/* Mobile: Open Orders Section (Below OrderForm) */}
                <div className="lg:hidden h-[300px] border-t border-border">
                    <UserTabs variant="spot" />
                </div>


                {/* DESKTOP LAYOUT */}
                {/* Middle: Chart & User Tabs (Now Left-Aligned since OrderBook is gone) */}
                <div className={`hidden lg:flex flex-1 flex-col min-w-0 lg:h-full`}>
                    <div className="flex-1 bg-surface border-b border-border relative min-h-[450px]">
                        <div className="absolute inset-0 w-full h-full">
                            <div className="absolute inset-0 w-full h-full">
                                <TradingViewChart
                                    symbol={coinId}
                                    chainId={currentMarket?.chainId}
                                    pairAddress={currentMarket?.pairAddress}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="h-[250px] shrink-0 border-r border-border">
                        <UserTabs variant="spot" />
                    </div>
                </div>

                {/* Right: Order Form */}
                <div className="hidden lg:flex w-full lg:w-[320px] bg-surface border-l border-border shrink-0 flex-col lg:h-full lg:overflow-y-auto">
                    <OrderForm
                        variant="spot"
                        currentPrice={price}
                        baseSymbol={baseSymbol}
                        quoteSymbol={quoteSymbol}
                        chainId={currentMarket?.chainId}
                    />
                    <div className="flex-1 p-4 hidden lg:block border-t border-border">
                        <div className="text-sm font-bold mb-4">Assets</div>

                        {/* Quote Asset */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-text-secondary">{quoteSymbol}</span>
                                <span className="font-bold text-text-primary">{(typeof balances[quoteSymbol] === 'object' ? balances[quoteSymbol]?.available || 0 : balances[quoteSymbol] || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Base Asset */}
                        <div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-text-secondary">{baseSymbol}</span>
                                <span className="font-bold text-text-primary">{(typeof balances[baseSymbol] === 'object' ? balances[baseSymbol]?.available || 0 : balances[baseSymbol] || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SpotTradePage;
