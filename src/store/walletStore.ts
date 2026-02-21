import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
    isConnected: boolean;
    address: string | null;
    balance: {
        bch: number;
        usd: number;
    };
    connectionType: 'mainnet' | 'local' | 'extension' | 'walletconnect' | null;
    isConnecting: boolean;

    // Actions
    setConnected: (address: string, type: 'mainnet' | 'local' | 'extension' | 'walletconnect') => void;
    setBalance: (bch: number, usd: number) => void;
    disconnect: () => void;
    setConnecting: (loading: boolean) => void;
}

export const useWalletStore = create<WalletState>()(
    persist(
        (set) => ({
            isConnected: false,
            address: null,
            balance: { bch: 0, usd: 0 },
            connectionType: null,
            isConnecting: false,

            setConnected: (address, type) => set({
                isConnected: true,
                address,
                connectionType: type,
                isConnecting: false
            }),

            setBalance: (bch, usd) => set((state) => ({
                balance: { ...state.balance, bch, usd }
            })),

            disconnect: () => set({
                isConnected: false,
                address: null,
                connectionType: null,
                balance: { bch: 0, usd: 0 }
            }),

            setConnecting: (loading) => set({ isConnecting: loading }),
        }),
        {
            name: 'wallet-storage',
            partialize: (state) => ({
                // Persist address but not connection state initially if we want auto-reconnect logic later
                // For now, persist basic info
                address: state.address,
                connectionType: state.connectionType
            }),
        }
    )
);
