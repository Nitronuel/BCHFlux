import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccountMode } from './userStore';

interface WalletState {
    isConnected: boolean;
    address: string | null;
    balance: {
        bch: number;
        usd: number;
    };
    connectionType: 'mainnet' | 'local' | 'extension' | 'walletconnect' | null;
    isConnecting: boolean;
    accountMode: AccountMode;

    // Actions
    setConnected: (address: string, type: 'mainnet' | 'local' | 'extension' | 'walletconnect') => void;
    setBalance: (bch: number, usd: number) => void;
    disconnect: () => void;
    setConnecting: (loading: boolean) => void;
    setAccountMode: (mode: AccountMode) => void;
}

export const useWalletStore = create<WalletState>()(
    persist(
        (set) => ({
            isConnected: false,
            address: null,
            balance: { bch: 0, usd: 0 },
            connectionType: null,
            isConnecting: false,
            accountMode: 'demo' as AccountMode,

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
                balance: { bch: 0, usd: 0 },
                accountMode: 'demo' as AccountMode, // Force back to demo on disconnect
            }),

            setConnecting: (loading) => set({ isConnecting: loading }),

            setAccountMode: (mode: AccountMode) => set({ accountMode: mode }),
        }),
        {
            name: 'wallet-storage-v2',
            partialize: (state) => ({
                address: state.address,
                connectionType: state.connectionType,
                accountMode: state.accountMode,
            }),
        }
    )
);
