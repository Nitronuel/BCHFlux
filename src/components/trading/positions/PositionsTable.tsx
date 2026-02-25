import React from 'react';
import Table, { type Column } from '../../common/Table';
import { useUserStore, type Position } from '../../../store/userStore';
import { useMarketStore } from '../../../store/marketStore';

const PositionsTable: React.FC = () => {
    const { positions, closePosition } = useUserStore();
    const { markets } = useMarketStore();

    const getMarkPrice = (symbol: string) => {
        const baseSymbol = symbol.split('/')[0].toUpperCase();
        const market = markets.find(m => m.symbol.toUpperCase() === baseSymbol);
        return market ? market.current_price : 0;
    };

    const handleClose = (position: Position) => {
        const markPrice = getMarkPrice(position.symbol);
        if (markPrice > 0) {
            closePosition(position.id, markPrice);
        }
    };

    const columns: Column<Position>[] = [
        {
            header: 'Symbol',
            accessor: (row) => (
                <div className="flex items-center gap-2">
                    <div className={`w-1 h-4 rounded-full bg-primary`}></div>
                    <span className="font-bold text-base">{row.symbol}</span>
                    <span className="text-xs bg-surface border border-border px-1 rounded text-text-secondary">{row.leverage}x</span>
                </div>
            ),
            className: 'w-[15%]'
        },
        {
            header: 'Size',
            accessor: (row) => (
                <span className="text-primary">
                    {row.size.toFixed(4)} <span className="text-xs text-text-secondary">{row.symbol.split('/')[0]}</span>
                </span>
            ),
            className: 'w-[10%]'
        },
        {
            header: 'Entry Price',
            accessor: (row) => row.entryPrice.toFixed(2),
            className: 'w-[12%]'
        },
        {
            header: 'Mark Price',
            accessor: (row) => getMarkPrice(row.symbol).toFixed(2),
            className: 'w-[12%]'
        },
        {
            header: 'Margin / Debt',
            accessor: (row) => (
                <div className="flex flex-col">
                    <div><span className="text-text-secondary w-12 inline-block text-xs">Margin:</span> {row.margin.toFixed(4)} <span className="text-xs text-text-secondary">BCH</span></div>
                    <div><span className="text-text-secondary w-12 inline-block text-xs">Debt:</span> <span className="text-sell">${(row.borrowedAmount || 0).toFixed(2)}</span></div>
                </div>
            ),
            className: 'w-[15%]'
        },
        {
            header: 'Interest',
            accessor: (row) => (
                <div className="text-sell">
                    ${(row.accruedInterest || 0).toFixed(4)}
                </div>
            ),
            className: 'w-[8%]'
        },
        {
            header: 'PNL (ROE %)',
            accessor: (row) => (
                <div className={row.unrealizedPnL >= 0 ? 'text-buy' : 'text-sell'}>
                    <div className="font-medium">{row.unrealizedPnL > 0 ? '+' : ''}{row.unrealizedPnL.toFixed(2)} USDT</div>
                    <div className="text-xs">{row.roe > 0 ? '+' : ''}{row.roe.toFixed(2)}%</div>
                </div>
            ),
            className: 'text-right'
        },
        {
            header: 'Action',
            accessor: (row) => (
                <button
                    onClick={() => handleClose(row)}
                    className="text-text-primary hover:text-white bg-border hover:bg-red-500/20 px-3 py-1 rounded text-xs transition-colors border border-border hover:border-red-500/50"
                >
                    Close
                </button>
            ),
            className: 'text-right'
        }
    ];

    const handleCloseAll = () => {
        if (confirm('Are you sure you want to close ALL positions at market price?')) {
            positions.forEach(p => {
                const markPrice = getMarkPrice(p.symbol);
                if (markPrice > 0) closePosition(p.id, markPrice);
            });
        }
    };

    if (positions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-disabled py-10">
                <span>No Open Positions</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-surface overflow-auto relative">
            <div className="flex justify-end p-2 border-b border-border">
                <button
                    onClick={handleCloseAll}
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded border border-red-500/20 transition-colors"
                >
                    Close All Positions
                </button>
            </div>
            <Table data={positions} columns={columns} />
        </div>
    );
};

export default PositionsTable;
