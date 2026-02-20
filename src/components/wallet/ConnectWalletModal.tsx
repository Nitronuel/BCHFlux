import React, { useState } from 'react';
import { X, Wallet, Shield, Smartphone, ArrowRight } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { WalletService } from '../../services/WalletService';

interface ConnectWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ isOpen, onClose }) => {
    const { setConnected, setBalance, setConnecting, isConnecting } = useWalletStore();
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConnectLocal = async () => {
        try {
            setConnecting(true);
            setError(null);

            // Init local wallet
            const address = await WalletService.initLocalWallet();
            const balance = await WalletService.getBalance();

            setConnected(address, 'local');
            setBalance(balance.bch, balance.usd);

            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to connect local wallet');
        } finally {
            setConnecting(false);
        }
    };

    const handleConnectExternal = () => {
        // Placeholder for WalletConnect / Extension
        // For now, just show a "Coming Soon" or link to docs
        alert("WalletConnect integration coming in Phase 2!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        Connect Wallet
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-hover rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-3">
                        {/* Option 1: Browser Wallet (Internal) */}
                        <button
                            onClick={handleConnectLocal}
                            disabled={isConnecting}
                            className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-hover transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold">Browser Wallet</div>
                                    <div className="text-xs text-text-secondary">Instant non-custodial wallet</div>
                                </div>
                            </div>
                            {isConnecting ? (
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <ArrowRight className="w-4 h-4 text-text-disabled group-hover:text-primary transition-colors" />
                            )}
                        </button>

                        {/* Option 2: WalletConnect (External) */}
                        <button
                            onClick={handleConnectExternal}
                            className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-blue-500/50 hover:bg-hover transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold">Connect App</div>
                                    <div className="text-xs text-text-secondary">Paytaca, Zapit, Cashonize</div>
                                </div>
                            </div>
                            <div className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-medium">SOON</div>
                        </button>
                    </div>

                    <div className="text-center text-xs text-text-disabled mt-4">
                        By connecting, you agree to our Terms of Service.
                        <br />
                        Your keys are stored locally on your device properly.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectWalletModal;
