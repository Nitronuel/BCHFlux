import { useState, useEffect } from 'react';

export interface BridgeTransaction {
    id: string;
    txId: string;
    timestamp: number;
    fromToken: string;
    toToken: string;
    toChain: string;
    amountIn: number;
    amountOut: number;
    status: 'pending' | 'completed' | 'failed';
    explorerUrl?: string;
}

const STORAGE_KEY = 'bch_bridge_history';

export const useBridgeHistory = () => {
    const [history, setHistory] = useState<BridgeTransaction[]>([]);

    // Load from local storage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load bridge history", e);
        }
    }, []);

    // Save transaction
    const addTransaction = (tx: Omit<BridgeTransaction, 'id' | 'timestamp' | 'status'>) => {
        const newTx: BridgeTransaction = {
            ...tx,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'completed', // For now, we assume immediate completion/submission
        };

        const updatedHistory = [newTx, ...history];
        setHistory(updatedHistory);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return {
        history,
        addTransaction,
        clearHistory
    };
};
