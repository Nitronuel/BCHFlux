import React, { useMemo, useState } from 'react';
import { PieChart, TrendingUp, TrendingDown, Wallet, Eye, EyeOff } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useMarketStore } from '../../store/marketStore';

interface PortfolioDashboardProps {
    onDeposit?: () => void;
    onWithdraw?: () => void;
    onTransfer?: () => void;
}

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ onDeposit, onWithdraw, onTransfer }) => {
    const { balances, positions } = useUserStore();
    const { markets } = useMarketStore();
    const [showBalance, setShowBalance] = useState(true);

    // Calculate Portfolio Metrics
    const portfolio = useMemo(() => {
        let totalValue = 0;
        let totalCost = 0;
        const assets = [];

        for (const [symbol, balance] of Object.entries(balances)) {
            const totalAmount = balance.available + balance.locked;
            if (totalAmount <= 0) continue;

            // Find current price
            // Handle USDT/Stablecoins
            let price = 1;
            let coinName = symbol;

            if (symbol !== 'USDT' && symbol !== 'USDC') {
                const market = markets.find(m => m.symbol.toUpperCase() === symbol);
                price = market?.current_price || 0;
                coinName = market?.name || symbol;
            }

            const currentValue = totalAmount * price;
            const avgBuyPrice = balance.averageBuyPrice || 0;

            // Cost basis: if avgBuyPrice exists use it, else assume current price (0 PnL) for display if missing
            // For USDT, cost is 1.
            const costBasis = (symbol === 'USDT' || avgBuyPrice === 0) ? currentValue : totalAmount * avgBuyPrice;

            totalValue += currentValue;
            totalCost += costBasis;

            assets.push({
                symbol,
                name: coinName,
                amount: totalAmount,
                value: currentValue,
                cost: costBasis,
                pnl: currentValue - costBasis,
                pnlPercent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0
            });
        }

        // Add Futures PnL to Total Value
        const futuresPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
        totalValue += futuresPnL;

        // Sort by value desc
        assets.sort((a, b) => b.value - a.value);

        return {
            totalValue,
            totalCost,
            totalPnL: totalValue - totalCost,
            totalPnLPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
            assets
        };
    }, [balances, markets, positions]);

    const isPositive = portfolio.totalPnL >= 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Portfolio Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-surface to-background border border-border rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <h2 className="text-text-secondary font-medium flex items-center gap-2 mb-1">
                                <Wallet className="w-4 h-4" /> Total Balance
                                <button onClick={() => setShowBalance(!showBalance)} className="text-text-secondary hover:text-primary transition-colors ml-2">
                                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                            </h2>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
                                    {showBalance ? `$${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '********'}
                                </span>
                                <span className="text-sm text-text-secondary">USD</span>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${isPositive ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell'}`}>
                            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {showBalance ? `${isPositive ? '+' : ''}${portfolio.totalPnLPercent.toFixed(2)}%` : '***'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
                        <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                            <div className="text-xs text-text-secondary mb-1">Today's PnL</div>
                            <div className={`font-bold ${isPositive ? 'text-buy' : 'text-sell'}`}>
                                {showBalance ? (
                                    <>
                                        {isPositive ? '+' : ''}${Math.abs(portfolio.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </>
                                ) : '****'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3 relative z-10 mt-auto">
                    <button onClick={onDeposit} className="flex items-center justify-center gap-2 py-2.5 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-colors">
                        <span>Deposit</span>
                    </button>
                    <button onClick={onWithdraw} className="flex items-center justify-center gap-2 py-2.5 bg-surface border border-border hover:bg-hover rounded-lg transition-colors font-medium">
                        <span>Withdraw</span>
                    </button>
                    <button onClick={onTransfer} className="flex items-center justify-center gap-2 py-2.5 bg-surface border border-border hover:bg-hover rounded-lg transition-colors font-medium">
                        <span>Transfer</span>
                    </button>
                </div>
            </div>

            {/* Asset Allocation & Stats */}
            <div className="bg-surface border border-border rounded-xl p-6 flex flex-col">
                <h3 className="text-text-primary font-bold mb-4 flex items-center gap-2">
                    <PieChart className="w-4 h-4" /> Allocation
                </h3>

                <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[200px] pr-1 scrollbar-thin">
                    {portfolio.assets.map((asset) => {
                        const percent = (asset.value / portfolio.totalValue) * 100;
                        return (
                            <div key={asset.symbol} className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-primary font-medium">{asset.symbol}</span>
                                    <span className="text-text-secondary">{percent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary opacity-80 rounded-full"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {portfolio.assets.length === 0 && (
                        <div className="text-center text-text-disabled text-sm py-4">
                            No assets found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PortfolioDashboard;
