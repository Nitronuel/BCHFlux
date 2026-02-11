import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { useUiStore } from '../../store/uiStore';
import Table, { type Column } from '../common/Table';

const FuturesWallet: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useUiStore();
    const [showBalance, setShowBalance] = useState(true);
    const { balances, positions } = useUserStore();

    // Calculate Futures Metrics
    const usdtBalance = balances['USDT'] || { available: 0, locked: 0 };
    const totalMargin = positions.reduce((sum, p) => sum + p.margin, 0);
    const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

    // Available for Futures is just the available USDT (assuming Unified Account for simplicity)
    const availableBalance = usdtBalance.available;

    // Wallet Balance (Equity) = Available + Margin + PnL
    const walletBalance = availableBalance + totalMargin + totalUnrealizedPnL;

    const assets = [
        {
            asset: 'USDT',
            walletBalance: walletBalance,
            unrealizedPnl: totalUnrealizedPnL,
            marginBalance: totalMargin,
            available: availableBalance
        },
    ];

    interface FuturesAsset {
        asset: string;
        walletBalance: number;
        unrealizedPnl: number;
        marginBalance: number;
        available: number;
    }

    const columns: Column<FuturesAsset>[] = [
        {
            header: 'Asset',
            accessor: (row) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500 text-xs font-bold">T</div>
                    <span>{row.asset}</span>
                </div>
            ),
            sortable: true
        },
        { header: 'Wallet Balance', accessor: (row) => `$${row.walletBalance.toFixed(2)}`, sortable: true },
        {
            header: 'Unrealized PNL',
            accessor: (row) => (
                <span className={row.unrealizedPnl >= 0 ? 'text-buy' : 'text-sell'}>
                    {row.unrealizedPnl > 0 ? '+' : ''}{row.unrealizedPnl.toFixed(2)}
                </span>
            ),
            sortable: true
        },
        { header: 'Margin Balance', accessor: (row) => `$${row.marginBalance.toFixed(2)}`, sortable: true },
        { header: 'Available Balance', accessor: (row) => `$${row.available.toFixed(2)}`, sortable: true },
    ];

    return (
        <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-surface rounded-xl border border-border p-6 shadow-sm relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold mb-1">Futures Account</h1>
                            <div className="text-text-secondary text-sm flex items-center gap-2">
                                Total Balance (USDT)
                                <button onClick={() => setShowBalance(!showBalance)} className="text-text-secondary hover:text-primary transition-colors">
                                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
                                {showBalance ? `$${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '********'}
                            </span>
                            <span className="text-text-secondary font-medium">≈ ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-background/50 rounded-lg border border-border/50">
                        <div>
                            <div className="text-text-secondary text-xs mb-1">Unrealized PNL</div>
                            <div className={`font-mono font-medium ${totalUnrealizedPnL >= 0 ? 'text-buy' : 'text-sell'}`}>
                                {showBalance ? `${totalUnrealizedPnL >= 0 ? '+' : ''}$${Math.abs(totalUnrealizedPnL).toFixed(2)}` : '****'}
                            </div>
                        </div>
                        <div>
                            <div className="text-text-secondary text-xs mb-1">Margin Balance</div>
                            <div className="font-mono font-medium text-text-primary">
                                {showBalance ? `$${totalMargin.toFixed(2)}` : '****'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <button
                            onClick={() => addToast('Transfer feature coming soon!', 'info')}
                            className="flex flex-col items-center justify-center gap-2 py-3 bg-surface border border-border hover:bg-hover rounded-lg transition-colors font-medium"
                        >
                            <span>Transfer</span>
                        </button>
                        <button
                            onClick={() => addToast('History feature coming soon!', 'info')}
                            className="flex flex-col items-center justify-center gap-2 py-3 bg-surface border border-border hover:bg-hover rounded-lg transition-colors font-medium"
                        >
                            <span>History</span>
                        </button>
                        <button
                            onClick={() => addToast('Data feature coming soon!', 'info')}
                            className="flex flex-col items-center justify-center gap-2 py-3 bg-surface border border-border hover:bg-hover rounded-lg transition-colors font-medium"
                        >
                            <span>Data</span>
                        </button>
                        <button
                            onClick={() => navigate('/leverage/BCHUSDT')}
                            className="flex flex-col items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            <span>Trade</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Assets Section */}
            <div className="bg-surface rounded-xl border border-border min-h-[400px] flex flex-col">
                <div className="p-4 lg:p-6 border-b border-border">
                    <h3 className="text-lg font-bold">Assets</h3>
                </div>

                {/* Mobile Asset List */}
                <div className="lg:hidden">
                    {assets.map((asset) => (
                        <div
                            key={asset.asset}
                            className="p-4 border-b border-border last:border-0"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-text-primary">{asset.asset}</span>
                                <span className="text-sm font-medium">{asset.walletBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-text-secondary">
                                <span>Margin Bal.</span>
                                <span>{asset.marginBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-text-secondary mt-1">
                                <span>Unrealized PNL</span>
                                <span className={`${asset.unrealizedPnl >= 0 ? 'text-buy' : 'text-sell'}`}>{asset.unrealizedPnl.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block">
                    <Table data={assets} columns={columns} />
                </div>
            </div>
        </div>
    );
};

export default FuturesWallet;
