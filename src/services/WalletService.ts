import { TestNetWallet, Wallet } from 'mainnet-js';
import { walletConnectService } from './walletConnectService';

// Configure Mainnet-js to use REST API or specific electrum servers if needed
// Config.EnforceCashToken = true; 

export class WalletService {
    private static wallet: Wallet | TestNetWallet | null = null;
    // @ts-ignore
    private static isTestnet = false;
    private static _connectionType: 'local' | 'walletconnect' | null = null;

    /**
     * Initialize a local internal wallet (Non-custodial, stored in browser)
     * This is useful for users who don't have a wallet yet.
     */
    static async initLocalWallet(): Promise<string> {
        try {
            // Check for existing WIF in localStorage
            const storedWif = localStorage.getItem('bch_internal_wif');
            let wallet: Wallet | TestNetWallet | null = null;

            // Validate stored WIF before attempting to load
            let isValidFormat = false;
            if (storedWif && typeof storedWif === 'string' && storedWif.length > 10) {
                if (storedWif.startsWith('L') || storedWif.startsWith('K') || storedWif.startsWith('c') || storedWif.startsWith('5')) {
                    isValidFormat = true;
                }
            }

            if (isValidFormat && storedWif) {
                console.log('Restoring wallet from WIF...');
                try {
                    wallet = await Wallet.fromWIF(storedWif);
                } catch (e) {
                    console.info("Stored WIF could not be restored. Creating new wallet.");
                    localStorage.removeItem('bch_internal_wif');
                    wallet = null;
                }
            } else if (storedWif) {
                console.info("Detected invalid wallet format in storage. Cleaning up...");
                localStorage.removeItem('bch_internal_wif');
            }

            if (!wallet) {
                console.log('Creating new random wallet...');
                wallet = await Wallet.newRandom();

                let wif: string = "";
                if (typeof (wallet as any).privateKeyWif === 'string') {
                    wif = (wallet as any).privateKeyWif;
                } else if (typeof (wallet as any).exportPrivateKey === 'function') {
                    wif = await (wallet as any).exportPrivateKey();
                } else if (typeof (wallet as any).getPrivateKey === 'function') {
                    const val = await (wallet as any).getPrivateKey();
                    if (typeof val === 'string') wif = val;
                }

                if (!wif || (!wif.startsWith('L') && !wif.startsWith('K') && !wif.startsWith('c') && !wif.startsWith('5'))) {
                    console.error("Generated invalid WIF, forcing exportPrivateKey", wif);
                    wif = await (wallet as any).exportPrivateKey();
                }

                localStorage.setItem('bch_internal_wif', wif);
            }

            this.wallet = wallet;
            this._connectionType = 'local';

            if (typeof (wallet as any).getAddress === 'function') {
                return (await (wallet as any).getAddress()) as string;
            } else if ((wallet as any).address) {
                return (wallet as any).address as string;
            } else {
                return (wallet as any).cashaddr as string;
            }

        } catch (error) {
            console.error('Failed to init local wallet:', error);
            throw error;
        }
    }

    /**
     * Get current balance from the actual chain.
     * Returns real BCH balance — no demo injection.
     */
    // @ts-ignore
    static async getBalance(): Promise<{ bch: number; usd: number }> {
        // WalletConnect — no local wallet object, return 0 (balance comes from session)
        if (this._connectionType === 'walletconnect') {
            return { bch: 0, usd: 0 };
        }

        if (!this.wallet) return { bch: 0, usd: 0 };

        try {
            const balance = await this.wallet.getBalance();
            const bch = (balance as any).bch || 0;
            return {
                bch,
                usd: (balance as any).usd || (bch * 400)
            };
        } catch (error) {
            console.warn('[WalletService] Failed to fetch balance:', error);
            return { bch: 0, usd: 0 };
        }
    }

    /**
     * Send BCH with optional Memo (OP_RETURN).
     * In demo mode: simulates the transaction.
     * In real mode: sends a real transaction.
     */
    static async sendBch(
        to: string,
        amountModels: { bch?: number, usd?: number },
        memo?: string,
        isDemoMode: boolean = false
    ): Promise<string> {
        // Demo mode — always simulate
        if (isDemoMode) {
            console.log('[WalletService] Demo mode — simulating transaction');
            await new Promise(r => setTimeout(r, 1500)); // Fake network delay
            return `demo-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        }

        // Route through WalletConnect if connected externally
        if (this._connectionType === 'walletconnect') {
            return walletConnectService.sendTransaction({
                to,
                value: amountModels.bch || 0,
                memo,
            });
        }

        if (!this.wallet) throw new Error("Wallet not initialized");

        const sats = Math.floor((amountModels.bch || 0) * 100000000);

        const outputs: any[] = [
            {
                cashaddr: to,
                value: sats,
                unit: 'sat'
            }
        ];

        if (memo) {
            outputs.push(["OP_RETURN", memo]);
        }

        console.log("[WalletService] Sending real transaction with outputs:", JSON.stringify(outputs));

        const { txId } = await this.wallet.send(outputs);
        return txId || "";
    }

    /**
     * Sign a message (for auth)
     */
    static async signMessage(message: string): Promise<string> {
        if (!this.wallet) throw new Error("Wallet not initialized");
        const sig = await this.wallet.sign(message);
        return (sig as any).signature || sig;
    }

    /**
     * Get the connection type
     */
    static get connectionType() {
        return this._connectionType;
    }

    /**
     * Set connection type externally (e.g., for WalletConnect)
     */
    static setConnectionType(type: 'local' | 'walletconnect' | null) {
        this._connectionType = type;
    }
}
