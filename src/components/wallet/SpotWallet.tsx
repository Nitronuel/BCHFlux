import React, { useState } from 'react';
import { Search, Plus, Pencil, Check, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table, { type Column } from '../common/Table';
import TokenDetailsModal from './modals/TokenDetailsModal';
import AddTokenModal from './modals/AddTokenModal';
import DeleteTokenModal from './modals/DeleteTokenModal';
import DepositModal from './modals/DepositModal';
import WithdrawModal from './modals/WithdrawModal';
import { useMarketStore } from '../../store/marketStore';
import { useUserStore } from '../../store/userStore';
import PortfolioDashboard from './PortfolioDashboard';

interface Asset {
    coin: string;
    id: string;
    name: string;
    image: string;
    total: number;
    available: number;
    inOrder: number;
    value: number;
    price: number;
}

const SpotWallet: React.FC = () => {
    const navigate = useNavigate();
    const { markets } = useMarketStore();
    const { balances } = useUserStore();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [hideSmallBalances, setHideSmallBalances] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Modals
    const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
    const [isTokenDetailsModalOpen, setIsTokenDetailsModalOpen] = useState(false);
    const [selectedToken, setSelectedToken] = useState<Asset | null>(null);
    const [tokenToDelete, setTokenToDelete] = useState<Asset | null>(null);

    // Action Modals
    const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);
    const [selectedTokenForAction, setSelectedTokenForAction] = useState<Asset | null>(null);

    // Construct Assets from Market and User Store
    const assets = React.useMemo(() => {
        if (markets.length === 0) return [];

        const newAssets: Asset[] = markets.map(market => {
            const balanceObj = balances[market.symbol.toUpperCase()] || { available: 0, locked: 0 };
            const available = balanceObj.available || 0;
            const total = available + (balanceObj.locked || 0);

            return {
                coin: market.symbol.toUpperCase(),
                id: market.id,
                name: market.name,
                image: market.image,
                total: total,
                available: available,
                inOrder: balanceObj.locked || 0,
                value: total * market.current_price,
                price: market.current_price
            };
        });

        // Sort by Value (desc) then Name
        newAssets.sort((a, b) => b.value - a.value);
        return newAssets;
    }, [markets, balances]);

    const handleTrade = (token: Asset) => {
        const pair = token.coin === 'USDT' ? 'BCHUSDT' : `${token.coin}USDT`;
        navigate(`/trade/spot/${pair}`);
    };

    const handleDeposit = (asset: Asset) => {
        setSelectedTokenForAction(asset);
        setActiveModal('deposit');
    };

    const handleWithdraw = (asset: Asset) => {
        setSelectedTokenForAction(asset);
        setActiveModal('withdraw');
    };

    const handleTokenClick = (asset: Asset) => {
        setSelectedToken(asset);
        setIsTokenDetailsModalOpen(true);
    };

    const moveMarket = (id: string, direction: 'up' | 'down') => {
        // This functionality belongs to marketStore for reordering
        // We can just call the store action if we expose it, or ignore for now.
        // The original code had it, assume marketStore has `moveMarket`.
        // Checked marketStore: Yes, `moveMarket` exists.
        useMarketStore.getState().moveMarket(id, direction);
    };

    const confirmDelete = () => {
        if (tokenToDelete) {
            useMarketStore.getState().removeCustomToken(tokenToDelete.id);
            setTokenToDelete(null);
        }
    };

    const closeActionModal = () => {
        setActiveModal(null);
        setSelectedTokenForAction(null);
    };

    const columns: Column<Asset>[] = [
        {
            header: 'Coin',
            accessor: (row) => (
                <div className="flex items-center gap-3">
                    <img src={row.image} alt={row.coin} className="w-8 h-8 rounded-full" />
                    <div>
                        <div className="font-bold text-text-primary">{row.coin}</div>
                        <div className="text-xs text-text-secondary">{row.name}</div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Total',
            accessor: (row) => row.total.toFixed(4),
            className: 'text-right'
        },
        {
            header: 'Available',
            accessor: (row) => row.available.toFixed(4),
            className: 'text-right hidden md:table-cell'
        },
        {
            header: 'Value',
            accessor: (row) => `$${row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            className: 'text-right'
        },
        {
            header: 'Action',
            accessor: (row) => (
                <div className="flex gap-3 text-primary text-sm font-medium justify-end">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeposit(row); }}
                        className="hover:text-white transition-colors"
                    >
                        Deposit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleWithdraw(row); }}
                        className="hover:text-white transition-colors"
                    >
                        Withdraw
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleTrade(row); }}
                        className="hover:text-white transition-colors"
                    >
                        Trade
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.coin.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBalance = !hideSmallBalances || asset.value >= 1;
        return matchesSearch && matchesBalance;
    });

    const PRESERVED_IDS = ['bitcoin-cash', 'bitcoin', 'ethereum', 'solana', 'tether'];

    return (
        <div className="space-y-6">
            {/* Dashboard */}
            <PortfolioDashboard
                onDeposit={() => {
                    const usdtAsset = assets.find(a => a.coin === 'USDT');
                    // Create a fallback asset if USDT not found in list (shouldn't happen if initialized correctly)
                    const fallback: Asset = {
                        coin: 'USDT', id: 'tether', name: 'Tether', image: '',
                        total: 0, available: 0, inOrder: 0, value: 0, price: 1
                    };
                    setSelectedTokenForAction(usdtAsset || fallback);
                    setActiveModal('deposit');
                }}
                onWithdraw={() => {
                    const usdtAsset = assets.find(a => a.coin === 'USDT');
                    const fallback: Asset = {
                        coin: 'USDT', id: 'tether', name: 'Tether', image: '',
                        total: 0, available: 0, inOrder: 0, value: 0, price: 1
                    };
                    setSelectedTokenForAction(usdtAsset || fallback);
                    setActiveModal('withdraw');
                }}
                onTransfer={() => { }}
            />

            {/* Assets Section */}
            <div className="bg-surface rounded-xl border border-border min-h-[400px] flex flex-col">
                <div className="p-4 lg:p-6 border-b border-border">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                            <input
                                type="text"
                                placeholder="Search Coin"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isEditing}
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-primary outline-none transition-colors disabled:opacity-50"
                            />
                        </div>

                        <div className="flex w-full md:w-auto justify-between md:justify-end items-center gap-4">
                            {!isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary select-none">
                                    <div
                                        className={`w-10 h-5 rounded-full relative transition-colors ${hideSmallBalances ? 'bg-primary' : 'bg-border'}`}
                                        onClick={() => setHideSmallBalances(!hideSmallBalances)}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hideSmallBalances ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <span className="text-xs lg:text-sm">Hide small</span>
                                </label>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isEditing
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
                                        className="flex items-center gap-1 px-4 py-2 bg-surface text-primary border border-border rounded-lg hover:text-white hover:bg-hover transition-colors text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden lg:inline">Add Custom Coin</span>
                                        <span className="lg:hidden">Add</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    // EDIT MODE LIST
                    <div className="divide-y divide-border">
                        {assets.map((asset, index) => (
                            <div key={asset.id} className="p-4 flex items-center justify-between bg-surface hover:bg-hover/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center gap-1 text-text-secondary">
                                        <button
                                            onClick={() => moveMarket(asset.id, 'up')}
                                            disabled={index === 0}
                                            className="hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => moveMarket(asset.id, 'down')}
                                            disabled={index === assets.length - 1}
                                            className="hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <img src={asset.image} alt={asset.coin} className="w-10 h-10 rounded-full grayscale opacity-80" />
                                    <div>
                                        <div className="font-bold text-text-primary">{asset.coin}</div>
                                        <div className="text-xs text-text-secondary">{asset.name}</div>
                                    </div>
                                </div>

                                <div>
                                    {!PRESERVED_IDS.includes(asset.id) && (
                                        <button
                                            onClick={() => setTokenToDelete(asset)}
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
                    // VIEW MODE (Original List/Table)
                    <>
                        {/* Mobile Asset List */}
                        <div className="lg:hidden">
                            {filteredAssets.map((asset) => (
                                <div
                                    key={asset.coin}
                                    onClick={() => handleTokenClick(asset)}
                                    className="p-4 border-b border-border last:border-0 active:bg-hover transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={asset.image} alt={asset.coin} className="w-10 h-10 rounded-full" />
                                        <div>
                                            <div className="font-bold text-text-primary">{asset.coin}</div>
                                            <div className="text-xs text-text-secondary">{asset.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-text-primary">{asset.total.toFixed(4)}</div>
                                        <div className="text-xs text-text-secondary">≈ ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden lg:block">
                            <Table data={filteredAssets} columns={columns} onRowClick={handleTokenClick} />
                        </div>
                    </>
                )}
            </div>

            <AddTokenModal isOpen={isAddTokenModalOpen} onClose={() => setIsAddTokenModalOpen(false)} />
            <TokenDetailsModal
                isOpen={isTokenDetailsModalOpen}
                onClose={() => setIsTokenDetailsModalOpen(false)}
                token={selectedToken}
            />
            <DeleteTokenModal
                isOpen={!!tokenToDelete}
                onClose={() => setTokenToDelete(null)}
                onConfirm={confirmDelete}
                tokenName={tokenToDelete?.name || ''}
                tokenSymbol={tokenToDelete?.coin || ''}
            />
            {selectedTokenForAction && (
                <>
                    <DepositModal
                        isOpen={activeModal === 'deposit'}
                        onClose={closeActionModal}
                        tokenName={selectedTokenForAction.name}
                        tokenSymbol={selectedTokenForAction.coin}
                        network="Ethereum"
                    />
                    <WithdrawModal
                        isOpen={activeModal === 'withdraw'}
                        onClose={closeActionModal}
                        tokenName={selectedTokenForAction.name}
                        tokenSymbol={selectedTokenForAction.coin}
                        network="Ethereum"
                        availableBalance={selectedTokenForAction.available}
                    />
                </>
            )}
        </div>
    );
};

export default SpotWallet;
