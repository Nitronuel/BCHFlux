import React, { useState } from 'react';
import {
    X,
    ArrowDown,
    ArrowUp,
    CreditCard,
    RefreshCw,
    ArrowUpRight,
    ArrowDownLeft,
    Lock,
    ShoppingCart,
    Info,
    ChevronDown
} from 'lucide-react';
import DepositModal from './DepositModal';
import WithdrawModal from './WithdrawModal';

interface TokenData {
    coin: string;
    name: string;
    total: number;
    value: number;
}

interface TokenDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: TokenData | null;
}

const TokenDetailsModal: React.FC<TokenDetailsModalProps> = ({ isOpen, onClose, token }) => {
    const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);

    if (!isOpen || !token) return null;

    // Mock Transactions Data
    const transactions = [
        { type: 'sent', title: `Sent ${token.coin}`, date: 'Today, 10:24 AM', to: '0x4f...a2', amount: `- 0.05 ${token.coin}`, value: '$113.82 USD' },
        { type: 'received', title: `Received ${token.coin}`, date: 'Oct 24, 2023', from: '0x82...1b', amount: `+ 0.42 ${token.coin}`, value: '$956.40 USD' },
        { type: 'staked', title: 'Staked', date: 'Oct 20, 2023', protocol: 'Lido Protocol', amount: `0.80 ${token.coin}`, rate: '4.2% APR' },
        { type: 'bought', title: `Bought ${token.coin}`, date: 'Oct 18, 2023', via: 'MoonPay', amount: `+ 0.10 ${token.coin}`, value: '$228.15 USD' },
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'sent': return <ArrowUpRight className="w-5 h-5 text-[#F6465D]" />;
            case 'received': return <ArrowDownLeft className="w-5 h-5 text-[#2EBD85]" />;
            case 'staked': return <Lock className="w-5 h-5 text-[#F0B90B]" />;
            case 'bought': return <ShoppingCart className="w-5 h-5 text-[#3B82F6]" />;
            default: return null;
        }
    };

    const getIconBg = (type: string) => {
        switch (type) {
            case 'sent': return 'bg-[#F6465D]/10';
            case 'received': return 'bg-[#2EBD85]/10';
            case 'staked': return 'bg-[#F0B90B]/10';
            case 'bought': return 'bg-[#3B82F6]/10';
            default: return 'bg-surface';
        }
    };

    const handleAction = (label: string) => {
        if (label === 'Deposit') setActiveModal('deposit');
        if (label === 'Withdraw') setActiveModal('withdraw');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="bg-[#0C1410] border border-[#1E2D24] rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Section */}
                <div className="flex flex-col items-center pt-8 pb-8 px-6 bg-gradient-to-b from-[#13231B] to-[#0C1410]">
                    {/* Token Icon */}
                    <div className="relative mb-4">
                        <div className="w-16 h-16 rounded-full bg-[#1E2D24] border-2 border-[#2EBD85]/20 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-[#2EBD85]/10">
                            {token.coin[0]}
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#2EBD85] border-2 border-[#0C1410] rounded-full"></div>
                    </div>

                    {/* Balance */}
                    <h2 className="text-3xl font-bold text-white mb-1">{token.total} {token.coin}</h2>
                    <p className="text-[#8B9D95] font-medium">${token.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</p>

                    {/* Network Badge */}
                    <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2D24] rounded-full border border-[#2A3F33] cursor-pointer hover:bg-[#2A3F33] transition-colors">
                        <div className="w-2 h-2 rounded-full bg-[#2EBD85]"></div>
                        <span className="text-xs font-medium text-[#D1D5DB]">{token.name} Network</span>
                        <ChevronDown className="w-3 h-3 text-text-secondary" />
                    </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-4 gap-2 px-6 pb-8 border-b border-[#1E2D24]">
                    {[
                        { label: 'Deposit', icon: ArrowDown, color: 'text-black', bg: 'bg-[#2EBD85] hover:bg-[#25A774]' },
                        { label: 'Withdraw', icon: ArrowUp, color: 'text-[#2EBD85]', bg: 'bg-[#1E2D24] hover:bg-[#2A3F33]' },
                        { label: 'Buy', icon: CreditCard, color: 'text-[#D0A341]', bg: 'bg-[#2D2A1E] hover:bg-[#3D3929]' }, // Gold-ish for Buy/Card
                        { label: 'Swap', icon: RefreshCw, color: 'text-text-secondary', bg: 'bg-[#1E2329] hover:bg-[#2A3038]' },
                    ].map((action, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleAction(action.label)}
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${action.bg}`}>
                                <action.icon className={`w-5 h-5 ${action.color}`} />
                            </div>
                            <span className="text-[10px] font-bold tracking-wider text-[#8B9D95] uppercase group-hover:text-white transition-colors">{action.label}</span>
                        </div>
                    ))}
                </div>

                {/* Transactions List */}
                <div className="px-6 py-6 bg-[#0C1410]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-[#8B9D95] tracking-wider">RECENT TRANSACTIONS</h3>
                        <button className="text-xs font-bold text-[#2EBD85] hover:underline">View All</button>
                    </div>

                    <div className="space-y-4">
                        {transactions.map((tx, idx) => (
                            <div key={idx} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconBg(tx.type)}`}>
                                        {getIcon(tx.type)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{tx.title}</div>
                                        <div className="text-xs text-[#5D6B64] flex items-center gap-1">
                                            {tx.date}
                                            <span className="w-0.5 h-0.5 rounded-full bg-[#5D6B64]"></span>
                                            {tx.to ? `To: ${tx.to}` : tx.from ? `From: ${tx.from}` : tx.via ? `Via ${tx.via}` : tx.protocol}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-sm font-bold ${tx.type === 'received' || tx.type === 'bought' ? 'text-[#2EBD85]' : 'text-white'}`}>
                                        {tx.amount || tx.rate}
                                    </div>
                                    {tx.value && (
                                        <div className="text-xs text-[#5D6B64]">{tx.value}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-4 border-t border-[#1E2D24] flex justify-center">
                    <button className="flex items-center gap-2 text-xs font-medium text-[#5D6B64] hover:text-[#8B9D95] transition-colors">
                        <Info className="w-3.5 h-3.5" />
                        Asset Policy & Fees
                    </button>
                </div>
            </div>

            {/* Modals */}
            <DepositModal
                isOpen={activeModal === 'deposit'}
                onClose={() => setActiveModal(null)}
                tokenName={token.name}
                tokenSymbol={token.coin}
                network={token.name} // Using token name as network for now
            />
            <WithdrawModal
                isOpen={activeModal === 'withdraw'}
                onClose={() => setActiveModal(null)}
                tokenName={token.name}
                tokenSymbol={token.coin}
                network={token.name}
                availableBalance={token.total} // Using total as available for now
            />
        </div>
    );
};


export default TokenDetailsModal;
