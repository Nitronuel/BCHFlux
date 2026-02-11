import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tokenName: string;
    tokenSymbol: string;
}

const DeleteTokenModal: React.FC<DeleteTokenModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tokenName,
    tokenSymbol
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>

                    <h2 className="text-xl font-bold text-text-primary mb-2">Delete Token?</h2>
                    <p className="text-text-secondary leading-relaxed mb-6">
                        Are you sure you want to remove <span className="font-bold text-text-primary">{tokenName} ({tokenSymbol})</span> from your wallet? This will not affect your blockchain balance, only the display.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-surface border border-border text-text-primary font-bold rounded-lg hover:bg-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteTokenModal;
