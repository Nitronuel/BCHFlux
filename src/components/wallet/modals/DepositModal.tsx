import React, { useState } from 'react';
import { X, Copy, Check, Info, QrCode, PlusCircle } from 'lucide-react';
import { useUserStore } from '../../../store/userStore';
import { useWalletStore } from '../../../store/walletStore';
import { useUiStore } from '../../../store/uiStore';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenName: string;
    tokenSymbol: string;
    network: string;
}

const DepositModal: React.FC<DepositModalProps> = ({
    isOpen,
    onClose,
    tokenName,
    tokenSymbol,
    network
}) => {
    const { accountMode, updateBalance } = useUserStore();
    const { address: walletAddress } = useWalletStore();
    const { addToast } = useUiStore();
    const [copied, setCopied] = useState(false);
    const isDemo = accountMode === 'demo';

    // Use real wallet address in live mode, mock in demo
    const getAddress = () => {
        if (!isDemo && walletAddress) {
            return walletAddress;
        }
        const prefix = network.toLowerCase().includes('eth') ? '0x' :
            network.toLowerCase().includes('sol') ? 'Sol' : 'bc1';
        return `${prefix}7a9...3f2${tokenSymbol}99`; // Mock address
    };

    const address = getAddress();

    const handleCopy = () => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDemoFaucet = () => {
        updateBalance(tokenSymbol, 1000);
        addToast(`Added 1,000 ${tokenSymbol} (Demo Mode)`, 'success');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Deposit {tokenSymbol}</h2>
                        <p className="text-sm text-text-secondary">On {network} Network</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {isDemo && (
                        <div className="mb-6 bg-primary/10 border border-primary/20 rounded-lg p-4">
                            <h3 className="text-primary font-bold mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" /> Demo Mode Active
                            </h3>
                            <p className="text-sm text-text-secondary mb-3">
                                You can instantly add funds to your demo wallet for testing.
                            </p>
                            <button
                                onClick={handleDemoFaucet}
                                className="w-full py-2 bg-primary text-background font-bold rounded hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add 1,000 {tokenSymbol}
                            </button>
                        </div>
                    )}

                    {!isDemo && (
                        <>
                            {/* QR Code Section */}
                            <div className="flex flex-col items-center justify-center mb-8">
                                <div className="w-48 h-48 bg-white p-4 rounded-xl mb-4 shadow-lg flex items-center justify-center">
                                    {/* Placeholder for QR Code - using QrCode icon for now, ideally use a real QR lib */}
                                    <QrCode className="w-40 h-40 text-black" strokeWidth={1} />
                                </div>
                                <p className="text-sm text-text-secondary text-center max-w-xs">
                                    Scan this QR code with your mobile wallet to deposit {tokenName}.
                                </p>
                            </div>

                            {/* Address Section */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-text-secondary mb-2">Wallet Address</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono break-all relative">
                                        {address}
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className={`p-3 rounded-lg border transition-all ${copied
                                            ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                            : 'bg-surface border-border text-primary hover:bg-hover'
                                            }`}
                                        title="Copy Address"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Warning/Info */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                                <div className="text-xs text-blue-200/80 leading-relaxed">
                                    <span className="font-bold text-blue-400">Important:</span> Send only <span className="font-bold text-blue-400">{tokenSymbol}</span> to this address. Sending any other asset may result in permanent loss.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-border bg-surface/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-surface border border-border text-text-primary font-bold rounded-lg hover:bg-hover transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DepositModal;
