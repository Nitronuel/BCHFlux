import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Table, { type Column } from '../../common/Table';
import { useUserStore, type Order } from '../../../store/userStore';

interface OrdersTableProps {
    variant?: 'spot' | 'futures';
}

const OrdersTable: React.FC<OrdersTableProps> = ({ variant = 'spot' }) => {
    const { orders, cancelOrder } = useUserStore();

    // Filters State
    const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'History'>('Open');
    const [pairFilter, setPairFilter] = useState('');
    const [sideFilter, setSideFilter] = useState<'All' | 'Buy' | 'Sell'>('All');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Limit' | 'Market'>('All');

    // Filter Logic
    const filteredOrders = orders.filter(order => {
        // Variant Filter
        const orderVariant = order.variant || 'spot';
        if (variant === 'spot' && orderVariant !== 'spot') return false;
        if (variant === 'futures' && orderVariant !== 'futures') return false;

        // Status Filter
        if (statusFilter === 'Open') {
            if (order.status !== 'Open' && order.status !== 'Partial') return false;
        } else if (statusFilter === 'History') {
            if (order.status === 'Open' || order.status === 'Partial') return false;
        }

        // Pair Filter
        if (pairFilter && !order.symbol.toLowerCase().includes(pairFilter.toLowerCase())) return false;

        // Side Filter
        if (sideFilter !== 'All' && order.side.toLowerCase() !== sideFilter.toLowerCase()) return false;

        // Type Filter
        if (typeFilter !== 'All' && order.type !== typeFilter) return false;

        return true;
    });

    const columns: Column<Order>[] = [
        {
            header: 'Date',
            accessor: (row) => <span className="text-text-secondary text-xs">{new Date(row.timestamp).toLocaleString()}</span>,
            className: 'w-[15%]'
        },
        {
            header: 'Pair',
            accessor: 'symbol',
            className: 'font-bold'
        },
        {
            header: 'Type',
            accessor: (row) => (
                <div className="flex flex-col">
                    <span>{row.type}</span>
                    {row.type === 'Stop Limit' && row.stopPrice && (
                        <span className="text-[10px] text-text-secondary">Stop: {row.stopPrice}</span>
                    )}
                </div>
            ),
            className: 'text-text-secondary'
        },
        {
            header: 'Side',
            accessor: (row) => (
                <span className={`font-medium ${row.side === 'buy' ? 'text-buy' : 'text-sell'}`}>
                    {row.side.toUpperCase()}
                </span>
            )
        },
        {
            header: 'Price',
            accessor: (row) => row.type === 'Market' ? 'Market' : row.price.toFixed(2)
        },
        {
            header: 'Amount',
            accessor: (row) => row.amount.toFixed(4)
        },
        {
            header: 'Filled',
            accessor: (row) => {
                const filled = row.filled || 0;
                const percent = (filled / row.amount) * 100;
                return (
                    <div className="flex flex-col w-full">
                        <div className="flex justify-between text-xs mb-1">
                            <span>{filled.toFixed(4)}</span>
                            <span className="text-text-secondary">{percent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${row.side === 'buy' ? 'bg-buy' : 'bg-sell'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Total',
            accessor: (row) => (row.price * row.amount).toFixed(2)
        },
        {
            header: 'Status',
            accessor: (row) => (
                <span className={`text-xs px-2 py-0.5 rounded ${row.status === 'Filled' ? 'bg-buy/10 text-buy' :
                    row.status === 'Cancelled' ? 'bg-text-disabled/10 text-text-disabled' :
                        'bg-primary/10 text-primary'
                    }`}>
                    {row.status}
                </span>
            )
        },
        {
            header: 'Action',
            accessor: (row) => (
                (row.status === 'Open' || row.status === 'Partial') ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); cancelOrder(row.id); }}
                        className="text-sell hover:text-sell/80 text-xs font-medium border border-sell/20 px-2 py-1 rounded hover:bg-sell/10 transition-colors"
                    >
                        Cancel
                    </button>
                ) : null
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 border-b border-border">
                {/* Status Tabs */}
                <div className="flex bg-background rounded-lg p-1 border border-border">
                    {(['Open', 'History', 'All'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${statusFilter === tab ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            {tab === 'Open' ? 'Open Orders' : tab === 'History' ? 'Order History' : 'All Orders'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-2 text-text-disabled" />
                    <input
                        type="text"
                        placeholder="Filter Pair"
                        value={pairFilter}
                        onChange={(e) => setPairFilter(e.target.value)}
                        className="bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs focus:border-primary outline-none w-32"
                    />
                </div>

                {/* Additional Filters */}
                <select
                    value={sideFilter}
                    onChange={(e) => setSideFilter(e.target.value as 'All' | 'Buy' | 'Sell')}
                    className="bg-background border border-border rounded px-2 py-1.5 text-xs focus:border-primary outline-none"
                >
                    <option value="All">All Sides</option>
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                </select>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'All' | 'Limit' | 'Market')}
                    className="bg-background border border-border rounded px-2 py-1.5 text-xs focus:border-primary outline-none"
                >
                    <option value="All">All Types</option>
                    <option value="Limit">Limit</option>
                    <option value="Market">Market</option>
                </select>

                <div className="ml-auto text-xs text-text-secondary">
                    Showing {filteredOrders.length} orders
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {filteredOrders.length > 0 ? (
                    <Table data={filteredOrders} columns={columns} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-text-disabled py-10">
                        <Filter className="w-8 h-8 mb-2 opacity-20" />
                        <span>No orders found</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersTable;
