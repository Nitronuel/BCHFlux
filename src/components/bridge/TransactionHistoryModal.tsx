import React from 'react';
import { ArrowRight, ExternalLink, X, Clock } from 'lucide-react';
import { type BridgeTransaction } from '../../hooks/useBridgeHistory';

interface TransactionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: BridgeTransaction[];
    onClear: () => void;
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ isOpen, onClose, history, onClear }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface rounded-2xl border border-border overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg text-white">Recent Swaps</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-background rounded-full transition-colors">
                        <X className="w-6 h-6 text-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-background/50">
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-text-secondary">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No recent transactions</p>
                        </div>
                    ) : (
                        history.map((tx) => (
                            <div key={tx.id} className="bg-surface p-4 rounded-xl border border-border hover:border-border/80 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                                        <span className="text-green-400">Sent {tx.amountIn} BCH</span>
                                        <ArrowRight className="w-3 h-3 text-text-secondary" />
                                        <span className="text-blue-400">{tx.amountOut.toLocaleString()} {tx.toToken}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${tx.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                        tx.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                        {tx.status}
                                    </span>
                                </div>

                                <div className="flex justify-between items-end text-xs text-text-secondary">
                                    <div>
                                        <div>{new Date(tx.timestamp).toLocaleString()}</div>
                                        <div className="mt-1">To: {tx.toChain}</div>
                                    </div>
                                    {tx.txId && (
                                        <a
                                            href={`https://blockchair.com/bitcoin-cash/transaction/${tx.txId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline hover:text-primary/80"
                                        >
                                            View Tx <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {history.length > 0 && (
                    <div className="p-4 border-t border-border bg-surface">
                        <button
                            onClick={onClear}
                            className="w-full py-2 text-sm text-text-secondary hover:text-red-400 transition-colors"
                        >
                            Clear History
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionHistoryModal;
