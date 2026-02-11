import React from 'react';
import { Terminal, Clock, ShieldCheck } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useMarketStore } from '../../store/marketStore';
import { useMemo } from 'react';

const DashboardTab: React.FC = () => {
    const { balances, positions } = useUserStore();



    // Let's actually do it properly:
    // We need market prices to calculate total value.
    // If we don't want to overcomplicate Profile, we can just display "Asset Count" or simple USDT balance.
    // BUT the user expects to see their portfolio value.

    // Let's stick to using useMarketStore.
    const { markets } = useMarketStore();

    const totalPortfolioValue = useMemo(() => {
        let total = 0;

        // Spot Assets
        Object.entries(balances).forEach(([symbol, balance]) => {
            const market = markets.find(m => m.symbol.toUpperCase() === symbol);
            const price = market?.current_price || (symbol === 'USDT' ? 1 : 0);
            total += (balance.available + balance.locked) * price;
        });

        // Futures PnL
        const futuresPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

        return total + futuresPnL;
    }, [balances, markets, positions]);

    return (
        <div className="space-y-6">
            {/* Portfolio Overview */}
            <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">Portfolio Overview</h2>
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <div className="text-text-secondary text-sm mb-1">Estimated Total Balance</div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-3xl font-bold font-mono tracking-tight">
                                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {/* <span className="text-buy font-medium bg-buy/10 px-2 py-0.5 rounded text-xs">+ $245.20 (2.1%)</span> */}
                        </div>
                        <div className="text-text-secondary text-sm">≈ {(totalPortfolioValue / (markets.find(m => m.symbol === 'btc')?.current_price || 1)).toFixed(5)} BTC</div>
                    </div>
                </div>
            </div>

            {/* Account Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2 text-text-secondary">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">Account Security</span>
                    </div>
                    <div className="text-xl font-bold text-buy">High</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2 text-text-secondary">
                        <Terminal className="w-4 h-4" />
                        <span className="text-sm font-medium">User Level</span>
                    </div>
                    <div className="text-xl font-bold">VIP 0</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2 text-text-secondary">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Last Login</span>
                    </div>
                    <div className="text-sm font-medium">2023-11-15 10:23:45</div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">Recent Login Activity</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-border text-text-secondary">
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium">Device</th>
                                <th className="pb-3 font-medium">Location</th>
                                <th className="pb-3 font-medium">IP Address</th>
                                <th className="pb-3 font-medium text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {[1, 2, 3].map((i) => (
                                <tr key={i}>
                                    <td className="py-3 text-text-primary">2023-11-1{i} 14:30:00</td>
                                    <td className="py-3 text-text-secondary">Chrome / Windows</td>
                                    <td className="py-3 text-text-secondary">United States</td>
                                    <td className="py-3 text-text-secondary">192.168.1.{i}</td>
                                    <td className="py-3 text-right text-buy">Success</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;
