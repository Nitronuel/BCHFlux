import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useMarketStore } from '../../store/marketStore';
import { useUserStore } from '../../store/userStore';

interface OverviewWalletProps {
    onTabChange: (tab: string) => void;
}

const OverviewWallet: React.FC<OverviewWalletProps> = ({ onTabChange }) => {
    const [showBalance, setShowBalance] = useState(true);
    const { markets } = useMarketStore();
    const { balances, leverageBalances, positions } = useUserStore();

    // Calculate Prices
    const btcPrice = markets.find(m => m.id === 'bitcoin')?.current_price || 0;

    // --- Spot Calculation ---
    // Spot Balance = Sum (Available + Locked) * Price
    let spotUsdValue = 0;
    for (const [symbol, balance] of Object.entries(balances)) {
        let price = 1; // Default USDT
        if (symbol !== 'USDT' && symbol !== 'USDC') {
            const market = markets.find(m => m.symbol.toUpperCase() === symbol);
            price = market?.current_price || 0;
        }
        spotUsdValue += (balance.available + balance.locked) * price;
    }


    // --- Leverage Calculation ---
    // Leverage Balance = Sum (Available + Locked) * Price + Unrealized PnL
    let leverageUsdValue = 0;
    for (const [symbol, balance] of Object.entries(leverageBalances)) {
        let price = 1;
        if (symbol !== 'USDT' && symbol !== 'USDC') {
            const market = markets.find(m => m.symbol.toUpperCase() === symbol);
            price = market?.current_price || 0;
        }
        leverageUsdValue += (balance.available + balance.locked) * price;
    }

    const totalUnrealizedPnLUSD = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0); // Assuming PnL is in USD

    // Total Leverage Account Value
    const totalLeverageUsdValue = leverageUsdValue + totalUnrealizedPnLUSD;
    const leverageBtcValue = btcPrice > 0 ? totalLeverageUsdValue / btcPrice : 0;

    // Spot is just Spot (no margin deduction needed anymore as they are separate wallets)
    const displaySpotUsdValue = spotUsdValue;
    const displaySpotBtcValue = btcPrice > 0 ? displaySpotUsdValue / btcPrice : 0;

    const accounts = [
        {
            name: 'Spot',
            balance: displaySpotUsdValue,
            btc: displaySpotBtcValue,
            change: 0, // No historical tracking for now
            color: 'text-primary'
        },
        {
            name: 'Leverage',
            balance: totalLeverageUsdValue,
            btc: leverageBtcValue,
            change: 0,
            color: 'text-red-500'
        },
    ];

    const totalBalance = displaySpotUsdValue + totalLeverageUsdValue;
    const totalBtc = btcPrice > 0 ? totalBalance / btcPrice : 0;

    return (
        <div className="space-y-6">
            {/* Total Balance */}
            <div className="bg-surface rounded-lg border border-border p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-text-secondary text-sm font-medium">Estimated Total Balance</h1>
                            <button onClick={() => setShowBalance(!showBalance)} className="text-text-secondary hover:text-primary transition-colors">
                                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="flex items-baseline gap-4 mb-2">
                            <span className="text-4xl font-bold font-mono tracking-tight text-white">
                                {showBalance ? `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '********'}
                            </span>
                            <span className="text-text-secondary text-lg">≈ {showBalance ? totalBtc.toFixed(4) : '****'} BTC</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-buy font-medium bg-buy/10 px-2 py-0.5 rounded text-xs">Total PNL: + $245.20 (Today)</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-6 py-2 bg-primary text-background font-bold rounded hover:bg-opacity-90 transition-colors">Deposit</button>
                        <button className="px-6 py-2 bg-surface border border-border hover:bg-hover rounded transition-colors">Withdraw</button>
                        <button className="px-6 py-2 bg-surface border border-border hover:bg-hover rounded transition-colors">Transfer</button>
                    </div>
                </div>
            </div>

            {/* Account Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {accounts.map((account) => (
                    <div key={account.name} className="bg-surface rounded-lg border border-border p-5 hover:border-primary/50 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-lg">{account.name}</h3>
                            <button
                                onClick={() => onTabChange(account.name)}
                                className="p-1.5 rounded-full bg-background text-text-secondary group-hover:text-primary transition-colors"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mb-1">
                            <span className="text-2xl font-bold font-mono tracking-tight">
                                {showBalance ? `$${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '********'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-text-secondary">
                            <span>≈ {showBalance ? account.btc.toFixed(4) : '****'} BTC</span>
                            {account.change > 0 && (
                                <span className="text-buy">+{account.change}%</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Transactions Stub */}
            <div className="bg-surface rounded-lg border border-border p-6">
                <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
                <div className="text-center py-10 text-text-secondary border border-dashed border-border rounded-lg bg-background/50">
                    No recent transactions
                </div>
            </div>
        </div>
    );
};

export default OverviewWallet;
