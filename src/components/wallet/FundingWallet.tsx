import React, { useState } from 'react';
import { Eye, EyeOff, CreditCard, Users, Gift } from 'lucide-react';
import Table, { type Column } from '../common/Table';

const FundingWallet: React.FC = () => {
    const [showBalance, setShowBalance] = useState(true);

    const assets = [
        { coin: 'USDT', total: 250.00, available: 250.00, frozen: 0.00, value: 250.00 },
    ];

    interface FundingAsset {
        coin: string;
        total: number;
        available: number;
        frozen: number;
        value: number;
    }

    const columns: Column<FundingAsset>[] = [
        { header: 'Coin', accessor: 'coin', sortable: true },
        { header: 'Total', accessor: (row) => row.total.toFixed(2), sortable: true },
        { header: 'Available', accessor: (row) => row.available.toFixed(2), sortable: true },
        { header: 'Frozen', accessor: (row) => row.frozen.toFixed(2), sortable: true },
        { header: 'Value', accessor: (row) => `$${row.value.toFixed(2)}`, sortable: true },
        {
            header: 'Action',
            accessor: () => (
                <div className="flex gap-3 text-primary text-sm font-medium">
                    <button className="hover:text-white">Pay</button>
                    <button className="hover:text-white">Send</button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-surface rounded-lg border border-border p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Funding</h1>
                        <div className="text-text-secondary text-sm">Estimated Balance</div>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-6 py-2 bg-primary text-background font-bold rounded hover:bg-opacity-90 transition-colors">Deposit</button>
                        <button className="px-6 py-2 bg-surface border border-border hover:bg-hover rounded transition-colors">Withdraw</button>
                        <button className="px-6 py-2 bg-surface border border-border hover:bg-hover rounded transition-colors">Transfer</button>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-bold font-mono tracking-tight">
                        {showBalance ? '$250.00' : '********'}
                    </span>
                    <button onClick={() => setShowBalance(!showBalance)} className="text-text-secondary hover:text-primary transition-colors">
                        {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background/50 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-background transition-colors cursor-pointer border border-transparent hover:border-primary/20">
                        <Users className="w-6 h-6 text-primary mb-2" />
                        <span className="font-medium text-sm">P2P</span>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-background transition-colors cursor-pointer border border-transparent hover:border-primary/20">
                        <CreditCard className="w-6 h-6 text-purple-500 mb-2" />
                        <span className="font-medium text-sm">Pay</span>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg flex flex-col items-center justify-center hover:bg-background transition-colors cursor-pointer border border-transparent hover:border-primary/20">
                        <Gift className="w-6 h-6 text-sell mb-2" />
                        <span className="font-medium text-sm">Gift Card</span>
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-lg border border-border p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Assets</h3>
                </div>
                <Table data={assets} columns={columns} />
            </div>
        </div>
    );
};

export default FundingWallet;
