// WalletConnect v2 Service for BCH Wallets (Paytaca, Zapit, Cashonize)
// Handles relay connection issues gracefully (DNS blocking in some regions)

import SignClient from '@walletconnect/sign-client';

const PROJECT_ID = '8b81541de3d6fff16bc61d8c42212ac7';

// Try multiple relay URLs in case one is DNS-blocked
const RELAY_URLS = [
    'wss://relay.walletconnect.com',
    'wss://relay.walletconnect.org',
];

// BCH namespace for WalletConnect
const BCH_NAMESPACE = {
    bch: {
        methods: ['bch_sendTransaction', 'bch_signMessage', 'bch_getAccounts'],
        chains: ['bch:bitcoincash'],
        events: ['accountsChanged', 'chainChanged'],
    },
};

// Timeout for relay connection (15 seconds)
const INIT_TIMEOUT_MS = 15000;

class WalletConnectService {
    private client: InstanceType<typeof SignClient> | null = null;
    private session: any = null;
    private _onSessionCallback: ((address: string) => void) | null = null;
    private _onDisconnectCallback: (() => void) | null = null;
    private _initPromise: Promise<void> | null = null;

    /**
     * Initialize the WalletConnect SignClient
     * Tries multiple relay URLs in case one is blocked.
     */
    async init(): Promise<void> {
        // Prevent multiple simultaneous init attempts
        if (this._initPromise) return this._initPromise;
        if (this.client) return;

        this._initPromise = this._doInit();
        try {
            await this._initPromise;
        } finally {
            this._initPromise = null;
        }
    }

    private async _doInit(): Promise<void> {
        for (const relayUrl of RELAY_URLS) {
            try {
                console.log(`[WalletConnect] Trying relay: ${relayUrl}`);

                // Race between init and timeout
                const client = await Promise.race([
                    SignClient.init({
                        projectId: PROJECT_ID,
                        relayUrl,
                        metadata: {
                            name: 'BCHFlux',
                            description: 'Universal BCH Swap & Trading Platform',
                            url: typeof window !== 'undefined' ? window.location.origin : 'https://bchflux.vercel.app',
                            icons: ['https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png'],
                        },
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Relay timeout: ${relayUrl}`)), INIT_TIMEOUT_MS)
                    ),
                ]);

                this.client = client;
                this._setupEventListeners();

                // Check for existing sessions to restore
                const lastSession = this.client.session.getAll().pop();
                if (lastSession) {
                    console.log('[WalletConnect] Restoring existing session');
                    this.session = lastSession;
                }

                console.log(`[WalletConnect] ✅ Connected to relay: ${relayUrl}`);
                return; // Success — exit the loop

            } catch (err) {
                console.warn(`[WalletConnect] Failed with relay ${relayUrl}:`, (err as Error).message);
                // Continue to next relay URL
            }
        }

        // All relays failed
        throw new Error(
            'Could not connect to WalletConnect relay. This may be due to network restrictions in your region. Please check your internet connection or try using a VPN.'
        );
    }

    private _setupEventListeners() {
        if (!this.client) return;

        this.client.on('session_event', (event) => {
            console.log('[WalletConnect] Session event:', event);
        });

        this.client.on('session_update', ({ topic, params }) => {
            console.log('[WalletConnect] Session updated:', topic, params);
        });

        this.client.on('session_delete', () => {
            console.log('[WalletConnect] Session deleted by wallet');
            this.session = null;
            this._onDisconnectCallback?.();
        });
    }

    /**
     * Connect to a wallet — returns the pairing URI for QR code display
     */
    async connect(): Promise<string> {
        if (!this.client) {
            throw new Error('WalletConnect not initialized. Call init() first.');
        }

        try {
            const { uri, approval } = await this.client.connect({
                optionalNamespaces: BCH_NAMESPACE,
            });

            // Handle approval asynchronously (wallet approves on their device)
            approval()
                .then((session) => {
                    this.session = session;
                    console.log('[WalletConnect] ✅ Session approved');

                    // Extract address from session
                    const accounts = session.namespaces?.bch?.accounts || [];
                    if (accounts.length > 0) {
                        // Account format: "bch:bitcoincash:qr..." or "bch:bitcoincash:bitcoincash:qr..."
                        const fullAccount = accounts[0];
                        const parts = fullAccount.split(':');
                        // Take everything after the chain namespace prefix
                        const address = parts.length >= 3 ? parts.slice(2).join(':') : fullAccount;
                        this._onSessionCallback?.(address);
                    }
                })
                .catch((err) => {
                    console.warn('[WalletConnect] Session rejected or timed out:', (err as Error).message);
                });

            return uri || '';
        } catch (err) {
            console.error('[WalletConnect] Connect failed:', (err as Error).message);
            throw err;
        }
    }

    /**
     * Send a BCH transaction via the connected wallet
     */
    async sendTransaction(params: {
        to: string;
        value: number;
        memo?: string;
    }): Promise<string> {
        if (!this.session || !this.client) {
            throw new Error('No WalletConnect session active. Please connect a wallet first.');
        }

        try {
            const result = await this.client.request({
                topic: this.session.topic,
                chainId: 'bch:bitcoincash',
                request: {
                    method: 'bch_sendTransaction',
                    params: [{
                        to: params.to,
                        value: Math.floor(params.value * 100000000), // BCH to satoshis
                        memo: params.memo || undefined,
                    }],
                },
            });

            console.log('[WalletConnect] ✅ Transaction sent');
            return (result as any).txId || (result as string) || '';
        } catch (err) {
            console.error('[WalletConnect] Transaction failed:', (err as Error).message);
            throw err;
        }
    }

    /**
     * Sign a message via the connected wallet
     */
    async signMessage(message: string): Promise<string> {
        if (!this.session || !this.client) {
            throw new Error('No WalletConnect session active');
        }

        const result = await this.client.request({
            topic: this.session.topic,
            chainId: 'bch:bitcoincash',
            request: {
                method: 'bch_signMessage',
                params: [message],
            },
        });

        return result as string;
    }

    /**
     * Disconnect the current session
     */
    async disconnect(): Promise<void> {
        if (this.session && this.client) {
            try {
                await this.client.disconnect({
                    topic: this.session.topic,
                    reason: { code: 6000, message: 'User disconnected' },
                });
            } catch (err) {
                console.warn('[WalletConnect] Disconnect error (non-fatal):', (err as Error).message);
            }
        }
        this.session = null;
        this.client = null; // Allow re-init with fresh relay attempt
    }

    /**
     * Check if a WalletConnect session is active
     */
    get isConnected(): boolean {
        return this.session !== null;
    }

    /**
     * Get the connected address from the active session
     */
    getAddress(): string | null {
        if (!this.session) return null;
        const accounts = this.session.namespaces?.bch?.accounts || [];
        if (accounts.length === 0) return null;

        const fullAccount = accounts[0];
        const parts = fullAccount.split(':');
        return parts.length >= 3 ? parts.slice(2).join(':') : fullAccount;
    }

    /**
     * Set callback for when a session is approved
     */
    onSession(callback: (address: string) => void) {
        this._onSessionCallback = callback;
    }

    /**
     * Set callback for when session is disconnected
     */
    onDisconnect(callback: () => void) {
        this._onDisconnectCallback = callback;
    }
}

export const walletConnectService = new WalletConnectService();
