import React, { useState } from 'react';
import { X, ArrowUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useUserStore } from '../../../store/userStore';
import { WalletService } from '../../../services/WalletService';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenName: string;
    tokenSymbol: string;
    network: string;
    availableBalance: number;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
    isOpen,
    onClose,
    tokenSymbol,
    network,
    availableBalance
}) => {
    const [address, setAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleMax = () => {
        setAmount(availableBalance.toString());
        setError(null);
    };

    const { accountMode, updateBalance } = useUserStore();
    const isDemo = accountMode === 'demo';
    const [_txHash, setTxHash] = useState<string | null>(null);

    const handleWithdraw = async () => {
        // Validation
        if (!address) {
            setError('Please enter a destination address.');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (parseFloat(amount) > availableBalance) {
            setError('Insufficient balance.');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            if (isDemo) {
                // Demo mode: simulate withdrawal
                await new Promise(r => setTimeout(r, 1500));
                updateBalance(tokenSymbol, -parseFloat(amount));
                setTxHash(`demo-tx-${Date.now()}`);
            } else {
                // Live mode: send real BCH
                const hash = await WalletService.sendBch(
                    address,
                    { bch: parseFloat(amount) },
                    undefined,
                    false // real mode
                );
                setTxHash(hash);
                // Balance will be synced from wallet polling
            }

            setIsLoading(false);
            setSuccess(true);

            // Auto close after success
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setAddress('');
                setAmount('');
                setTxHash(null);
            }, 3000);
        } catch (err: any) {
            setIsLoading(false);
            setError(err?.message || 'Transaction failed. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Withdraw {tokenSymbol}</h2>
                        <p className="text-sm text-text-secondary">On {network} Network</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">Withdrawal Successful!</h3>
                            <p className="text-text-secondary text-center">
                                Your transaction has been broadcast to the network.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Address Input */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Destination Address</label>
                                <input
                                    type="text"
                                    placeholder={`Paste ${tokenSymbol} address`}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary outline-none transition-colors"
                                />
                            </div>

                            {/* Amount Input */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-text-secondary">Amount</label>
                                    <div className="text-xs text-text-secondary">
                                        Available: <span className="text-text-primary font-medium">{availableBalance} {tokenSymbol}</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg pl-4 pr-16 py-3 text-text-primary focus:border-primary outline-none transition-colors appearance-none"
                                    />
                                    <button
                                        onClick={handleMax}
                                        className="absolute right-3 top-3 text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded transition-colors"
                                    >
                                        MAX
                                    </button>
                                </div>
                                {error && (
                                    <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            {/* Network Fee (Mock) */}
                            <div className="flex justify-between items-center py-3 border-t border-border mt-2">
                                <span className="text-sm text-text-secondary">Network Fee</span>
                                <span className="text-sm text-text-primary">0.0001 {tokenSymbol}</span>
                            </div>

                            <button
                                onClick={handleWithdraw}
                                disabled={isLoading}
                                className="w-full py-3 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <ArrowUp className="w-5 h-5" />
                                        Withdraw
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WithdrawModal;
