import React, { useState } from 'react';
import OverviewWallet from '../components/wallet/OverviewWallet';
import SpotWallet from '../components/wallet/SpotWallet';
import LeverageWallet from '../components/wallet/LeverageWallet';

const WalletPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Overview');

    const renderActiveWallet = () => {
        switch (activeTab) {
            case 'Overview':
                return <OverviewWallet onTabChange={setActiveTab} />;
            case 'Spot':
                return <SpotWallet />;
            case 'Leverage':
                return <LeverageWallet />;
            default:
                return <OverviewWallet onTabChange={setActiveTab} />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation - Horizontal Scroll on Mobile, Vertical Sidebar on Desktop */}
                <div className="lg:col-span-1 bg-background lg:bg-surface lg:rounded-lg lg:border lg:border-border lg:p-4 h-fit sticky top-16 lg:top-20 z-10 -mx-4 px-4 lg:mx-0 lg:px-4 border-b border-border lg:border-b-0">
                    <div className="text-xs font-bold text-text-secondary mb-4 px-2 hidden lg:block">WALLETS</div>
                    <nav className="flex lg:block overflow-x-auto space-x-6 lg:space-x-0 lg:space-y-1 no-scrollbar pb-0">
                        {['Overview', 'Spot', 'Leverage'].map(item => (
                            <button
                                key={item}
                                onClick={() => setActiveTab(item)}
                                className={`whitespace-nowrap flex-shrink-0 py-3 lg:py-3 lg:px-4 rounded-none lg:rounded-md transition-all font-medium flex items-center justify-between text-sm lg:text-base w-auto lg:w-full text-left relative
                                    ${activeTab === item
                                        ? 'text-primary lg:bg-primary/10 lg:text-primary lg:border-transparent'
                                        : 'text-text-secondary hover:text-text-primary lg:hover:bg-hover lg:border-transparent'}`}
                            >
                                {item}
                                {activeTab === item && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary lg:hidden rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {renderActiveWallet()}
                </div>
            </div>
        </div>
    );
};

export default WalletPage;
