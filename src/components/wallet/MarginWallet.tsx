import React from 'react';
import { Info } from 'lucide-react';
import Table, { type Column } from '../common/Table';

const MarginWallet: React.FC = () => {

    const positions = [
        { coin: 'BTC', size: 0.5, entryPrice: 42100, markPrice: 42350, pnl: 125.00, roe: 2.5 },
    ];

    interface MarginPosition {
        coin: string;
        size: number;
        entryPrice: number;
        markPrice: number;
        pnl: number;
        roe: number;
    }

    const columns: Column<MarginPosition>[] = [
        { header: 'Coin', accessor: 'coin', sortable: true },
        { header: 'Size', accessor: 'size', sortable: true },
        { header: 'Entry Price', accessor: (row) => `$${row.entryPrice}`, sortable: true },
        { header: 'Mark Price', accessor: (row) => `$${row.markPrice}`, sortable: true },
        {
            header: 'PNL (ROE)',
            accessor: (row) => (
                <span className={row.pnl >= 0 ? 'text-buy' : 'text-sell'}>
                    {row.pnl} ({row.roe}%)
                </span>
            ),
            sortable: true
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface rounded-lg border border-border p-6 text-center md:text-left">
                    <div className="text-text-secondary text-sm mb-1">Total Margin Balance</div>
                    <div className="text-2xl font-bold font-mono">
                        0.00000000 BTC
                    </div>
                    <div className="text-sm text-text-secondary">≈ $0.00</div>
                </div>
                <div className="bg-surface rounded-lg border border-border p-6 text-center md:text-left">
                    <div className="text-text-secondary text-sm mb-1 flex items-center gap-1 justify-center md:justify-start">
                        Margin Level <Info className="w-3 h-3" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-buy">
                        999.00
                    </div>
                    <div className="text-sm text-text-secondary">Low Risk</div>
                </div>
                <div className="bg-surface rounded-lg border border-border p-6 flex items-center justify-center gap-4">
                    <button className="px-4 py-2 bg-primary text-background font-bold rounded hover:bg-opacity-90 transition-colors w-full md:w-auto">Transfer</button>
                    <button className="px-4 py-2 bg-surface border border-border hover:bg-hover rounded transition-colors w-full md:w-auto">Borrow</button>
                    <button className="px-4 py-2 bg-surface border border-border hover:bg-hover rounded transition-colors w-full md:w-auto">Repay</button>
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border p-6 min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Open Positions</h3>
                </div>
                {positions.length > 0 ? (
                    <Table data={positions} columns={columns} />
                ) : (
                    <div className="text-center py-20 text-text-secondary border border-dashed border-border rounded-lg bg-background/50">
                        No open margin positions
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarginWallet;
