import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { useUiStore } from '../../store/uiStore';
import Table, { type Column } from '../common/Table';
import { useMarketStore } from '../../store/marketStore';

const LeverageWallet: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useUiStore();
    const [showBalance, setShowBalance] = useState(true);
    const { leverageBalances, positions } = useUserStore();
    const { markets } = useMarketStore();

    // Calculate Leverage Metrics (BCH Collateral)
    const bchBalance = leverageBalances['BCH'] || { available: 0, locked: 0 };
    const bchPrice = markets.find(m => m.symbol.toUpperCase() === 'BCH')?.current_price || 0;

    // Total Margin & PnL in USD (approx) 
    // Wait, in userStore openPosition, we deduct `marginRequiredToken`. If BCH, we deduct BCH.
    // But `p.margin` property.. let's check userStore interfaces.
    // `margin` in `Position` seems to be the USD value in the map? 
    // Actually, `openPosition` logic:
    // if collateral is BCH: marginRequiredToken = positionData.margin
    // So `p.margin` IS the token amount if BCH-margined.

    // Let's assume p.margin is in Collateral Asset (BCH).
    const totalMarginBCH = positions.reduce((sum, p) => sum + p.margin, 0);

    // PnL in userStore is calculated in USD in `syncPositionPnL`?
    // roe = (pnl / pos.margin) * 100.
    // If pos.margin is BCH, then PnL must be BCH for ROE to make sense?
    // `syncPositionPnL`: 
    // pnl = (mark - entry) * size (Linear PnL in USD for simple swaps?)
    // This part of the store is a bit ambiguous. 
    // For this UI task, I will assume `p.unrealizedPnL` is in USD.
    // And I will convert it to BCH for the display, or just display USD values.

    // Simpler: 
    // Available: BCH
    // Margin: BCH
    // PnL: Convert USD PnL to BCH

    const totalUnrealizedPnLUSD = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalUnrealizedPnLBCH = bchPrice > 0 ? totalUnrealizedPnLUSD / bchPrice : 0;

    const availableBCH = bchBalance.available; // This is purely what's in the wallet
    const walletBalanceBCH = availableBCH + totalMarginBCH + totalUnrealizedPnLBCH;

    const walletBalanceUSD = walletBalanceBCH * bchPrice;

    // Assets List
    const assets = [
        {
            asset: 'BCH',
            walletBalance: walletBalanceBCH,
            unrealizedPnl: totalUnrealizedPnLBCH,
            marginBalance: totalMarginBCH,
            available: availableBCH
        },
    ];

    interface LeverageAsset {
        asset: string;
        walletBalance: number;
        unrealizedPnl: number;
        marginBalance: number;
        available: number;
    }

    const columns: Column<LeverageAsset>[] = [
        {
            header: 'Asset',
            accessor: (row) => (
                <div className="flex items-center gap-2">
                    <img src="https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png" alt="BCH" className="w-6 h-6 rounded-full" />
                    <span>{row.asset}</span>
                </div>
            ),
            sortable: true
        },
        { header: 'Wallet Balance', accessor: (row) => `${row.walletBalance.toFixed(4)}`, sortable: true },
        {
            header: 'Unrealized PNL',
            accessor: (row) => (
                <span className={row.unrealizedPnl >= 0 ? 'text-buy' : 'text-sell'}>
                    {row.unrealizedPnl > 0 ? '+' : ''}{row.unrealizedPnl.toFixed(4)}
                </span>
            ),
            sortable: true
        },
        { header: 'Margin Balance', accessor: (row) => `${row.marginBalance.toFixed(4)}`, sortable: true },
        { header: 'Available Balance', accessor: (row) => `${row.available.toFixed(4)}`, sortable: true },
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
                            <h1 className="text-xl lg:text-2xl font-bold mb-1">Leverage Account</h1>
                            <div className="text-text-secondary text-sm flex items-center gap-2">
                                Total Balance (USD)
                                <button onClick={() => setShowBalance(!showBalance)} className="text-text-secondary hover:text-primary transition-colors">
                                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
                                {showBalance ? `$${walletBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '********'}
                            </span>
                            <span className="text-text-secondary font-medium">≈ {walletBalanceBCH.toFixed(4)} BCH</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-background/50 rounded-lg border border-border/50">
                        <div>
                            <div className="text-text-secondary text-xs mb-1">Unrealized PNL (USD)</div>
                            <div className={`font-mono font-medium ${totalUnrealizedPnLUSD >= 0 ? 'text-buy' : 'text-sell'}`}>
                                {showBalance ? `${totalUnrealizedPnLUSD >= 0 ? '+' : ''}$${Math.abs(totalUnrealizedPnLUSD).toFixed(2)}` : '****'}
                            </div>
                        </div>
                        <div>
                            <div className="text-text-secondary text-xs mb-1">Margin Balance (BCH)</div>
                            <div className="font-mono font-medium text-text-primary">
                                {showBalance ? `${totalMarginBCH.toFixed(4)}` : '****'}
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
                                <span className="text-sm font-medium">{asset.walletBalance.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-text-secondary">
                                <span>Margin Bal.</span>
                                <span>{asset.marginBalance.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-text-secondary mt-1">
                                <span>Unrealized PNL</span>
                                <span className={`${asset.unrealizedPnl >= 0 ? 'text-buy' : 'text-sell'}`}>{asset.unrealizedPnl.toFixed(4)}</span>
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

export default LeverageWallet;
