import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, CandlestickChart, Info } from 'lucide-react';

import MarketSelector from '../components/trading/header/MarketSelector';
import TradingViewChart from '../components/trading/TradingViewChart';
import OrderForm from '../components/trading/forms/OrderForm';
import UserTabs from '../components/trading/UserTabs';
import LeverageSelector from '../components/trading/LeverageSelector';
import { useMarketStore } from '../store/marketStore';
import { useUserStore } from '../store/userStore';
import { useUiStore } from '../store/uiStore';

const FuturesTradePage: React.FC = () => {
    const { pair = 'BCHUSDT' } = useParams();
    const navigate = useNavigate();
    const [leverage, setLeverage] = useState(1.2);
    const [isChartVisible, setIsChartVisible] = useState(false);

    const { markets, initializeMarkets } = useMarketStore();
    const { balances, updateBalance } = useUserStore();
    const { addToast } = useUiStore();

    useEffect(() => {
        if (markets.length === 0) {
            initializeMarkets();
        }
    }, [markets.length, initializeMarkets]);

    // Find the current market based on pair
    const symbol = pair.replace('USDT', '').toLowerCase();
    const currentMarket = markets.find(m => m.symbol.toLowerCase() === symbol);
    const coinId = currentMarket?.id || 'bitcoin-cash';

    // Redirect if pair is valid but not found in markets (e.g. BTC when we only support BCH)
    // Only do this after markets are initialized
    useEffect(() => {
        if (markets.length > 0 && !currentMarket) {
            navigate('/leverage/BCHUSDT', { replace: true });
        }
    }, [markets.length, currentMarket, navigate]);

    const price = currentMarket?.current_price ?? 0;
    const change = currentMarket?.price_change_percentage_24h ?? 0;
    const isPositive = change >= 0;

    // Mock Liquidity Data logic based on market cap
    const marketCap = currentMarket?.market_cap ?? 0;
    const liquidity = marketCap > 50_000_000_000 ? 6_000_000 :
        marketCap > 10_000_000_000 ? 2_500_000 :
            marketCap > 1_000_000_000 ? 1_000_000 : 500_000;

    // Calculate Max Leverage based on Liquidity
    const maxLeverage = liquidity >= 5_000_000 ? 3 :
        liquidity >= 1_000_000 ? 2 :
            liquidity >= 500_000 ? 1.2 : 1;

    // Reset leverage if it exceeds new max
    // Done during render to avoid cascading effects (React pattern for derived state adjustment)
    if (leverage > maxLeverage) {
        setLeverage(maxLeverage);
    }

    const handleSelectPair = (newPair: string) => {
        navigate(`/leverage/${newPair}`);
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] pb-16 lg:pb-0 bg-background text-text-primary">
            {/* Top Asset Info Bar - Margin Swap Variant */}
            <div className="h-16 border-b border-border bg-surface flex items-center px-4 justify-between shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-6 w-full">
                    <div className="flex flex-col">
                        <MarketSelector
                            currentPair={pair}
                            variant="futures"
                            onSelectPair={handleSelectPair}
                        />
                    </div>

                    <span className={`${isPositive ? 'text-buy' : 'text-sell'} font-bold text-lg hidden lg:block`}>
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>

                    <div className="hidden lg:flex gap-6 text-xs">
                        <span className="flex flex-col">
                            <span className="text-text-secondary">Mark Price</span>
                            <span>{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                        <span className="flex flex-col">
                            <div className="flex items-center gap-1 text-text-secondary">
                                <span>Pool Liquidity</span>
                                <Info className="w-3 h-3" />
                            </div>
                            <span className={`${liquidity > 1000000 ? 'text-primary' : 'text-warning'} font-medium`}>
                                ${(liquidity / 1000000).toFixed(1)}M
                            </span>
                        </span>
                        <span className="flex flex-col">
                            <span className="text-text-secondary">Borrow Interest</span>
                            <span className="text-sell">0.01% / hr</span>
                        </span>
                        <span className="flex flex-col">
                            <span className="text-text-secondary">24h Change</span>
                            <span className={isPositive ? 'text-buy' : 'text-sell'}>
                                {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </span>
                        </span>
                    </div>
                </div>

                <div className="hidden lg:flex gap-3">
                    <button className="px-3 py-1 bg-surface border border-border rounded text-xs hover:bg-hover">Tutorial</button>
                    <button className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded text-xs hover:bg-primary/20">How it Works</button>
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
                <div className="lg:hidden h-[400px] bg-surface border-b border-border relative">
                    <TradingViewChart symbol={coinId} />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-128px)] lg:min-h-[600px]">

                {/* Mobile: OrderForm Full Width */}
                <div className="flex lg:hidden flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        {/* Mobile Leverage Selector */}
                        <div className="p-2 border-b border-border">
                            <LeverageSelector
                                currentLeverage={leverage}
                                maxLeverage={maxLeverage}
                                liquidity={liquidity}
                                onChange={setLeverage}
                            />
                        </div>
                        <OrderForm
                            variant="futures"
                            leverage={leverage}
                            currentPrice={price}
                            baseSymbol={symbol.toUpperCase()}
                            quoteSymbol="USDT"
                        />
                    </div>
                </div>

                {/* Mobile: Open Orders Section */}
                <div className="lg:hidden h-[300px] border-t border-border">
                    <UserTabs variant="futures" />
                </div>


                {/* DESKTOP LAYOUT */}
                {/* Middle: Chart & User Tabs (Now Left-Aligned) */}
                <div className={`hidden lg:flex flex-1 flex-col min-w-0 lg:h-full`}>
                    <div className="flex-1 bg-surface border-b border-border relative min-h-[450px]">
                        <div className="absolute inset-0 w-full h-full">
                            <TradingViewChart
                                symbol={coinId}
                                chainId={currentMarket?.chainId}
                                pairAddress={currentMarket?.pairAddress}
                            />
                        </div>
                    </div>
                    <div className="h-[250px] shrink-0 border-r border-border">
                        <UserTabs variant="futures" />
                    </div>
                </div>

                {/* Right: Order Form & Margin Specifics */}
                <div className="hidden lg:flex w-full lg:w-[320px] bg-surface border-l border-border shrink-0 flex-col lg:h-full lg:overflow-y-auto">
                    {/* Desktop Leverage Selector */}
                    <div className="p-3 border-b border-border">
                        <LeverageSelector
                            currentLeverage={leverage}
                            maxLeverage={maxLeverage}
                            liquidity={liquidity}
                            onChange={setLeverage}
                        />
                    </div>

                    <OrderForm
                        variant="futures"
                        leverage={leverage}
                        currentPrice={price}
                        baseSymbol={symbol.toUpperCase()}
                        quoteSymbol="USDT"
                    />

                    <div className="p-4 border-t border-border mt-auto hidden lg:block">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-text-secondary">Collateral Assets</span>
                            <Settings className="w-3 h-3 text-text-secondary cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm bg-background p-2 rounded">
                                <span className="text-text-secondary">Wallet Balance</span>
                                <span className="font-medium">{((balances['BCH']?.available || 0) + (balances['BCH']?.locked || 0)).toFixed(4)} BCH</span>
                            </div>
                            <div className="flex justify-between text-sm bg-background p-2 rounded">
                                <span className="text-text-secondary">Locked Collateral</span>
                                <span className="font-medium">{(balances['BCH']?.locked || 0).toFixed(4)} BCH</span>
                            </div>
                            <div className="flex justify-between text-sm bg-background p-2 rounded">
                                <span className="text-text-secondary">Available for Leverage</span>
                                <span className="font-medium text-buy">{(balances['BCH']?.available || 0).toFixed(4)} BCH</span>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => {
                                    updateBalance('BCH', 10);
                                    addToast('Added 10 BCH to collateral wallet', 'success');
                                }}
                                className="flex-1 py-2 bg-text-disabled/20 rounded hover:bg-text-disabled/40 transition-colors text-xs font-medium"
                            >
                                Add Collateral (+10 BCH)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FuturesTradePage;
