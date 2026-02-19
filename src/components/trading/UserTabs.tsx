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
    const tabs = ['Positions', 'Open Orders', 'Order History', 'Trade History'];

    return (
        <div className="flex flex-col h-full bg-surface">
            {/* Unified Filter Bar (Matches OrdersTable style) */}
            <div className="flex items-center gap-4 p-4 border-b border-border">
                <div className="flex bg-background rounded-lg p-1 border border-border">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isActive ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                {tab === 'Positions' ? `Positions (${positions.length})` : tab}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
                {activeTab === 'Positions' && (
                    <PositionsTable />
                )}

                {activeTab === 'Open Orders' && (
                    <OrdersTable variant={variant} controlledStatus="Open" />
                )}

                {activeTab === 'Order History' && (
                    <OrdersTable variant={variant} controlledStatus="History" />
                )}

                {activeTab === 'Trade History' && (
                    <div className="flex flex-col items-center justify-center h-full text-text-disabled py-10"><span>No Trade History</span></div>
                )}
            </div>
        </div>
    );
};

export default UserTabs;

