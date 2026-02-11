import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Star } from 'lucide-react';
import { useMarketStore } from '../../../store/marketStore';

interface MarketPair {
    id: string;
    symbol: string;
    base: string;
    quote: string;
    price: string;
    change: number;
    volume: string;
    leverage?: string;
    isFavorite: boolean;
    image: string;
    chainId?: string;
}

interface MarketSelectorProps {
    currentPair: string;
    variant: 'spot' | 'futures';
    onSelectPair: (pair: string) => void;
}

const formatVolume = (num: number): string => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toFixed(0);
};

const MarketSelector: React.FC<MarketSelectorProps> = ({ currentPair, variant, onSelectPair }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Top Volume');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { markets, initializeMarkets } = useMarketStore();

    // Load markets on mount
    useEffect(() => {
        if (markets.length === 0) {
            initializeMarkets();
        }
    }, [markets.length, initializeMarkets]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Transform API data to MarketPair format
    const marketPairs: MarketPair[] = markets.map(coin => {
        // Determine if it's a "standard" market pair like BTC/USDT or a Cross-Chain Asset
        // For now, let's treat everything as X/USDT conceptually for price, but display differently.
        const isCrossChain = coin.chainId && coin.chainId !== 'bitcoin-cash' && coin.chainId !== 'bitcoin';

        return {
            id: coin.id,
            // If cross-chain, just use symbol (e.g. POPCAT). If standard, append USDT (BTCUSDT).
            symbol: isCrossChain ? coin.symbol.toUpperCase() : `${coin.symbol.toUpperCase()}USDT`,
            base: coin.symbol.toUpperCase(),
            quote: isCrossChain ? '' : 'USDT', // No quote symbol for cross-chain
            price: coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }), // More decimals for shtocoins
            change: coin.price_change_percentage_24h ?? 0,
            volume: formatVolume(coin.total_volume),
            leverage: coin.id === 'bitcoin' || coin.id === 'ethereum' ? '125x' : '75x',
            isFavorite: ['bitcoin-cash', 'bitcoin', 'ethereum', 'solana', 'popcat-sol'].includes(coin.id),
            image: coin.image,
            chainId: coin.chainId
        };
    });

    const filteredMarkets = marketPairs.filter(m =>
        m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.base.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
            >
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        {currentPair}
                        {variant === 'futures' && (
                            <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-text-secondary font-normal uppercase">
                                Perpetual
                            </span>
                        )}
                    </h1>
                    <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Content */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[400px] bg-[#15191D] border border-border/50 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Search */}
                    <div className="p-3 pb-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1E2329] border border-border/50 text-text-primary text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 px-4 py-2 border-b border-border/50 text-sm font-medium">
                        <button className="text-text-secondary hover:text-text-primary"><Star className="w-4 h-4" /></button>
                        {['All', 'Top Volume', 'Gainers', 'New'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-1 relative ${activeTab === tab ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Header Row */}
                    <div className="flex justify-between px-4 py-2 text-xs text-text-secondary">
                        <div className="w-[40%]">Symbol</div>
                        <div className="w-[30%] text-right cursor-pointer flex items-center justify-end gap-1">
                            Last Price <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="w-[30%] text-right">24h Change</div>
                    </div>

                    {/* List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {filteredMarkets.map(market => (
                            <div
                                key={market.symbol}
                                onClick={() => {
                                    onSelectPair(market.symbol);
                                    setIsOpen(false);
                                }}
                                className="flex justify-between px-4 py-2 hover:bg-[#1E2329] cursor-pointer transition-colors items-center group"
                            >
                                <div className="w-[40%] flex items-center gap-2">
                                    <Star className={`w-3.5 h-3.5 ${market.isFavorite ? 'text-text-secondary fill-text-secondary' : 'text-text-disabled'} hover:text-primary transition-colors`} />
                                    <img src={market.image} alt={market.base} className="w-5 h-5 rounded-full" />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-text-primary text-sm">{market.base}</span>
                                            {market.chainId && (
                                                <span className={`text-[9px] px-1 rounded border ${market.chainId === 'solana' ? 'border-[#14F195]/30 text-[#14F195] bg-[#14F195]/10' :
                                                    market.chainId === 'ethereum' ? 'border-[#627EEA]/30 text-[#627EEA] bg-[#627EEA]/10' :
                                                        market.chainId === 'base' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                                                            'border-gray-500 text-gray-400'
                                                    }`}>
                                                    {market.chainId.slice(0, 3).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {market.quote && <span className="text-text-secondary text-[10px]">{market.quote}</span>}
                                    </div>
                                    {variant === 'futures' && market.leverage && (
                                        <span className="text-[10px] bg-surface border border-border px-1 rounded text-text-secondary ml-1 bg-opacity-50">
                                            {market.leverage}
                                        </span>
                                    )}
                                </div>
                                <div className="w-[30%] text-right text-sm font-medium text-text-primary group-hover:text-white">
                                    ${market.price}
                                </div>
                                <div className={`w-[30%] text-right text-sm font-medium ${market.change >= 0 ? 'text-buy' : 'text-sell'}`}>
                                    {market.change > 0 ? '+' : ''}{market.change.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Mock */}
                    <div className="px-4 py-2 bg-[#1E2329] text-xs text-text-secondary flex justify-between border-t border-border/50">
                        <span>Showing {filteredMarkets.length} pairs</span>
                        <span className="text-primary cursor-pointer hover:underline">View All Markets</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketSelector;
