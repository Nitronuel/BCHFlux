import React, { useState } from 'react';
import OrdersTable from './orders/OrdersTable';
import PositionsTable from './positions/PositionsTable';
import { useUserStore } from '../../store/userStore';

interface UserTabsProps {
    variant?: 'spot' | 'futures';
}

const UserTabs: React.FC<UserTabsProps> = ({ variant = 'futures' }) => {
    const { positions } = useUserStore();
    const [activeTab, setActiveTab] = useState('Positions');

    // For spot variant, just show OrdersTable directly without tabs
    if (variant === 'spot') {
        return (
            <div className="flex flex-col h-full bg-surface">
                <OrdersTable variant={variant} />
            </div>
        );
    }

    // Futures variant keeps the full tab bar
    const tabs = [`Positions (${positions.length})`, 'Orders', 'Trade History', 'Funds'];

    // Helper to get clean tab name for state
    const getTabName = (tab: string) => tab.split(' (')[0];

    return (
        <div className="flex flex-col h-full bg-surface">
            <div className="flex border-b border-border px-4 overflow-x-auto">
                {tabs.map(tab => {
                    const cleanName = getTabName(tab);
                    const isActive = activeTab === cleanName;

                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(cleanName)}
                            className={`mr-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            {tab}
                            {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                        </button>
                    );
                })}
            </div>
            <div className="flex-1 overflow-auto p-0">
                {activeTab === 'Positions' && (
                    <PositionsTable />
                )}

                {activeTab === 'Orders' && (
                    <OrdersTable variant={variant} />
                )}

                {activeTab === 'Trade History' && (
                    <div className="flex flex-col items-center justify-center h-full text-text-disabled py-10"><span>No Trade History</span></div>
                )}
                {activeTab === 'Funds' && (
                    <div className="p-4 space-y-2">
                        {useUserStore.getState().balances && Object.entries(useUserStore.getState().balances).map(([symbol, bal]) => (
                            bal.available > 0 && (
                                <div key={symbol} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                                    <span className="text-text-secondary">{symbol}</span>
                                    <span className="font-medium text-text-primary">{bal.available.toFixed(4)}</span>
                                </div>
                            )
                        ))}
                        {(!useUserStore.getState().balances || Object.keys(useUserStore.getState().balances).length === 0) && (
                            <div className="text-center text-text-disabled py-4">No Data</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserTabs;

