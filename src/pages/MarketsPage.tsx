import React, { useState } from 'react';
import { Search, Plus, Pencil, Check, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import Table, { type Column } from '../components/common/Table';
import AddTokenModal from '../components/wallet/modals/AddTokenModal';
import DeleteTokenModal from '../components/wallet/modals/DeleteTokenModal';
import { useMarketStore } from '../store/marketStore';

interface MarketPair {
    id: string;
    pair: string;
    symbol: string;
    name: string;
    image: string;
    price: number;
    change: number;
    high: number;
    low: number;
    volume: number;
    marketCap: number;
}

const formatVolume = (num: number): string => {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
};

const MarketsPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tokenToDelete, setTokenToDelete] = useState<{ id: string; name: string; symbol: string } | null>(null);

    const { markets, isLoading, error, initializeMarkets, moveMarket, removeCustomToken } = useMarketStore();

    // Markets are initialized in App.tsx, no need to call here
    // initializeMarkets uses cache-first + WebSocket for real-time updates

    // Transform API data to table format
    const data: MarketPair[] = markets.map((coin) => ({
        id: coin.id,
        pair: `${coin.symbol.toUpperCase()}/USD`,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        price: coin.current_price,
        change: coin.price_change_percentage_24h ?? 0,
        high: coin.high_24h,
        low: coin.low_24h,
        volume: coin.total_volume,
        marketCap: coin.market_cap,
    }));

    const PRESERVED_IDS = ['bitcoin-cash', 'bitcoin', 'ethereum', 'solana', 'tether'];

    const confirmDelete = () => {
        if (tokenToDelete) {
            removeCustomToken(tokenToDelete.id);
            setTokenToDelete(null);
        }
    };

    const columns: Column<MarketPair>[] = [
        {
            header: 'Token',
            accessor: (row) => (
                <div className="flex items-center gap-3">
                    {/* Coin Logo */}
                    <img
                        src={row.image}
                        alt={row.name}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    {/* Coin Name */}
                    <div className="flex flex-col">
                        <span className="font-bold text-text-primary text-sm whitespace-nowrap">{row.name}</span>
                        <span className="text-xs text-text-secondary">{row.symbol}</span>
                    </div>
                </div>
            ),
            className: 'w-auto min-w-[180px]',
            sortable: true
        },
        {
            header: 'Price',
            accessor: (row) => `$${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            className: 'w-auto',
            sortable: true
        },
        {
            header: '24h Change',
            accessor: (row) => (
                <span className={row.change >= 0 ? 'text-buy' : 'text-sell'}>
                    {row.change > 0 ? '+' : ''}{row.change.toFixed(2)}%
                </span>
            ),
            className: 'w-auto',
            sortable: true
        },
        {
            header: '24h High',
            accessor: (row) => `$${row.high?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '---'}`,
            className: 'w-auto text-text-secondary whitespace-nowrap hidden md:table-cell',
            sortable: true
        },
        {
            header: '24h Low',
            accessor: (row) => `$${row.low?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '---'}`,
            className: 'w-auto text-text-secondary whitespace-nowrap hidden md:table-cell',
            sortable: true
        },
        {
            header: '24h Volume',
            accessor: (row) => formatVolume(row.volume),
            className: 'w-auto text-text-secondary whitespace-nowrap',
            sortable: true
        },
        {
            header: 'Market Cap',
            accessor: (row) => formatVolume(row.marketCap),
            className: 'w-auto text-text-secondary whitespace-nowrap hidden lg:table-cell',
            sortable: true
        }
    ];

    const filteredData = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.symbol.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="container mx-auto px-4 py-4 lg:py-8">
            <div className="flex flex-col gap-4 lg:gap-6">
                {/* Add Custom Token Section - Compact Mobile Design */}
                <div className="bg-surface rounded-xl border border-border p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 w-full md:w-auto text-center md:text-left">
                        <h2 className="text-lg lg:text-xl font-bold mb-1">Custom Tokens</h2>
                        <p className="text-text-secondary text-sm">Add and manage your custom tokens.</p>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 lg:px-6 lg:py-3 rounded-lg font-bold transition-colors ${isEditing
                                    ? 'bg-primary text-background hover:bg-opacity-90'
                                    : 'bg-surface border border-border text-text-primary hover:bg-hover'
                                }`}
                        >
                            {isEditing ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Done</span>
                                </>
                            ) : (
                                <>
                                    <Pencil className="w-4 h-4" />
                                    <span>Edit</span>
                                </>
                            )}
                        </button>

                        {!isEditing && (
                            <button
                                onClick={() => setIsAddTokenModalOpen(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 lg:px-6 lg:py-3 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-colors text-sm lg:text-base"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Custom Token</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-surface rounded-xl border border-border p-4 lg:p-6 min-h-[500px] lg:min-h-[600px] overflow-hidden">
                    {/* Search only, no Tabs */}
                    <div className="flex flex-col md:flex-row justify-end items-center mb-4 lg:mb-6 gap-4">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                            <input
                                type="text"
                                placeholder="Search Coin Name"
                                value={search}
                                disabled={isEditing}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-primary outline-none transition-colors disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading && markets.length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="flex items-center justify-center h-64 text-text-secondary">
                            <p>Failed to load markets. <button onClick={initializeMarkets} className="text-primary underline">Retry</button></p>
                        </div>
                    )}

                    {/* Table View (Scrollable on Mobile) */}
                    {!isLoading && !error && (
                        <div className="overflow-x-auto">
                            {isEditing ? (
                                // EDIT MODE LIST
                                <div className="divide-y divide-border">
                                    {data.map((coin, index) => (
                                        <div key={coin.id} className="p-4 flex items-center justify-between bg-surface hover:bg-hover/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center gap-1 text-text-secondary">
                                                    <button
                                                        onClick={() => moveMarket(coin.id, 'up')}
                                                        disabled={index === 0}
                                                        className="hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveMarket(coin.id, 'down')}
                                                        disabled={index === data.length - 1}
                                                        className="hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full grayscale opacity-80" />
                                                <div>
                                                    <div className="font-bold text-text-primary">{coin.name}</div>
                                                    <div className="text-xs text-text-secondary">{coin.symbol}</div>
                                                </div>
                                            </div>

                                            <div>
                                                {!PRESERVED_IDS.includes(coin.id) && (
                                                    <button
                                                        onClick={() => setTokenToDelete({ id: coin.id, name: coin.name, symbol: coin.symbol })}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                        title="Remove Token"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // VIEW MODE
                                <Table
                                    data={filteredData}
                                    columns={columns}
                                    rowKey="id"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AddTokenModal isOpen={isAddTokenModalOpen} onClose={() => setIsAddTokenModalOpen(false)} />
            <DeleteTokenModal
                isOpen={!!tokenToDelete}
                onClose={() => setTokenToDelete(null)}
                onConfirm={confirmDelete}
                tokenName={tokenToDelete?.name || ''}
                tokenSymbol={tokenToDelete?.symbol || ''}
            />
        </div>
    );
};

export default MarketsPage;
