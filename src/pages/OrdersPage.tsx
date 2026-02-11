import React, { useState } from 'react';
import Table, { type Column } from '../components/common/Table';
import { useUserStore } from '../store/userStore';

const OrdersPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Spot Orders');
    const [subTab, setSubTab] = useState('Open Orders');

    const subTabs = ['Open Orders', 'Order History', 'Trade History', 'Transaction History'];

    // React to Global State
    const { orders } = useUserStore();

    const columns: Column<import('../store/userStore').Order>[] = [
        {
            header: 'Date',
            accessor: (row) => new Date(row.timestamp).toLocaleString(),
            className: 'text-text-secondary'
        },
        { header: 'Pair', accessor: 'symbol', className: 'font-medium' },
        { header: 'Type', accessor: 'type' },
        { header: 'Side', accessor: (row) => <span className={row.side === 'buy' ? 'text-buy' : 'text-sell'}>{row.side.toUpperCase()}</span> },
        { header: 'Price', accessor: (row) => row.price.toFixed(2) },
        { header: 'Amount', accessor: 'amount' },
        { header: 'Filled', accessor: () => '0%' },
        { header: 'Total', accessor: (row) => row.total.toFixed(2) + ' USDT' },
        {
            header: 'Action',
            accessor: () => <button className="text-primary hover:text-white">Cancel</button>,
            className: 'text-right'
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Orders</h1>

            <div className="bg-surface rounded-lg border border-border min-h-[600px] flex flex-col md:flex-row">
                {/* Left Sidebar */}
                <div className="w-full md:w-64 border-r border-border p-4">
                    <nav className="space-y-1">
                        {['Spot Orders', 'Leverage Orders', 'Buy Crypto History', 'Loan History'].map(item => (
                            <button
                                key={item}
                                onClick={() => setActiveTab(item)}
                                className={`w-full text-left px-4 py-3 rounded-md transition-colors font-medium ${activeTab === item ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}
                            >
                                {item}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6">
                    <h2 className="text-xl font-bold mb-6">{activeTab}</h2>

                    {/* Sub Tabs */}
                    <div className="flex border-b border-border mb-6">
                        {subTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSubTab(tab)}
                                className={`mr-6 pb-3 font-medium transition-colors relative ${subTab === tab ? 'text-primary border-b-2 border-primary -mb-0.5' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <Table data={orders} columns={columns} />
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;
