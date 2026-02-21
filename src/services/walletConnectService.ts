// WalletConnect v2 Service for BCH Wallets (Paytaca, Zapit, Cashonize)
// Based on verified working implementations:
//   - cashonize/cashonize-wallet (wallet side)
//   - MerlinB/walletconnect-test (dApp side)
//   - fran-dv/bch-connect-monorepo (library)
//
// Key specs:
//   Namespace: "bch"
//   Chain ID:  "bch:bitcoincash" (mainnet)
//   Methods:   "bch_getAddresses", "bch_signTransaction", "bch_signMessage"
//   Events:    "addressesChanged"
//   Account:   "bch:<address>" e.g. "bch:bitcoincash:qr..."

import SignClient from '@walletconnect/sign-client';

const PROJECT_ID = '8b81541de3d6fff16bc61d8c42212ac7';

// Try multiple relay URLs in case one is DNS-blocked
const RELAY_URLS = [
    'wss://relay.walletconnect.com',
    'wss://relay.walletconnect.org',
];

// BCH WalletConnect namespace — matches what Paytaca/Cashonize expect
const BCH_CHAIN_ID = 'bch:bitcoincash';
const BCH_REQUIRED_NAMESPACES = {
    bch: {
        chains: [BCH_CHAIN_ID],
        methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
        events: ['addressesChanged'],
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
    private _pendingPairingTopic: string | null = null;

    /**
     * Initialize the WalletConnect SignClient.
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
                return;

            } catch (err) {
                console.warn(`[WalletConnect] Failed with relay ${relayUrl}:`, (err as Error).message);
            }
        }

        throw new Error(
            'Could not connect to WalletConnect relay. This may be due to network restrictions in your region. Please try using a VPN.'
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
     * Connect to a wallet — returns the pairing URI for QR code display.
     * Each call generates a FRESH pairing URI.
     */
    async connect(): Promise<string> {
        if (!this.client) {
            throw new Error('WalletConnect not initialized. Call init() first.');
        }

        // Clean up any stale pending pairings before creating a new one
        await this._cleanupStalePairings();

        try {
            // Use requiredNamespaces with the "bch" namespace
            // This is what Cashonize/Paytaca check for when approving sessions
            const { uri, approval } = await this.client.connect({
                requiredNamespaces: BCH_REQUIRED_NAMESPACES,
            });

            console.log('[WalletConnect] Pairing URI generated, waiting for wallet approval...');

            // Track this pairing topic so we can clean it up later
            if (uri) {
                const topicMatch = uri.match(/^wc:([^@]+)@/);
                this._pendingPairingTopic = topicMatch ? topicMatch[1] : null;
            }

            // Handle approval asynchronously (wallet approves on their device)
            approval()
                .then((session) => {
                    this.session = session;
                    this._pendingPairingTopic = null;
                    console.log('[WalletConnect] ✅ Session approved');
                    console.log('[WalletConnect] Namespaces:', JSON.stringify(session.namespaces, null, 2));

                    const address = this._extractAddress(session);
                    if (address) {
                        console.log('[WalletConnect] Connected address:', address);
                        this._onSessionCallback?.(address);
                    } else {
                        console.warn('[WalletConnect] No BCH address found in session');
                    }
                })
                .catch((err) => {
                    this._pendingPairingTopic = null;
                    console.warn('[WalletConnect] Session rejected or timed out:', (err as Error).message);
                });

            return uri || '';
        } catch (err) {
            console.error('[WalletConnect] Connect failed:', (err as Error).message);
            throw err;
        }
    }

    /**
     * Extract BCH address from session namespaces.
     * Cashonize format: accounts = ["bch:bitcoincash:qr..."] → strip "bch:" prefix → "bitcoincash:qr..."
     * We want the cashaddr, so we take everything after the chain reference.
     */
    private _extractAddress(session: any): string | null {
        // Primary: "bch" namespace (Paytaca, Cashonize)
        const bchAccounts = session.namespaces?.bch?.accounts || [];
        if (bchAccounts.length > 0) {
            // Cashonize uses: "bch:bitcoincash:qr..." → we want "bitcoincash:qr..."
            const fullAccount = bchAccounts[0];
            // Strip the "bch:" namespace prefix (first 4 chars)
            const addressPart = fullAccount.substring(4);
            console.log('[WalletConnect] Extracted address:', addressPart);
            return addressPart;
        }

        // Fallback: try any namespace
        for (const ns of Object.values(session.namespaces || {})) {
            const accounts = (ns as any)?.accounts || [];
            if (accounts.length > 0) {
                const fullAccount = accounts[0];
                const parts = fullAccount.split(':');
                return parts.length >= 3 ? parts.slice(2).join(':') : fullAccount;
            }
        }

        return null;
    }

    /**
     * Clean up stale pairings so fresh QR codes can be generated.
     */
    private async _cleanupStalePairings(): Promise<void> {
        if (!this.client) return;

        try {
            // Clean up inactive pairings
            const pairings = this.client.pairing.getAll({ active: false });
            for (const pairing of pairings) {
                try {
                    await this.client.pairing.delete(pairing.topic, {
                        code: 6000,
                        message: 'Cleaning up stale pairing',
                    });
                } catch {
                    // Ignore individual cleanup errors
                }
            }

            // Clean up the specific pending pairing
            if (this._pendingPairingTopic) {
                try {
                    await this.client.pairing.delete(this._pendingPairingTopic, {
                        code: 6000,
                        message: 'User cancelled',
                    });
                } catch {
                    // Ignore
                }
                this._pendingPairingTopic = null;
            }
        } catch {
            // Non-fatal
        }
    }

    /**
     * Cancel the current pending connection (user clicked back).
     */
    async cancelPending(): Promise<void> {
        await this._cleanupStalePairings();
    }

    /**
     * Send a BCH transaction via the connected wallet.
     * Uses bch_signTransaction method that Cashonize/Paytaca support.
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
                chainId: BCH_CHAIN_ID,
                request: {
                    method: 'bch_signTransaction',
                    params: {
                        recipientAddress: params.to,
                        amount: Math.floor(params.value * 100000000), // satoshis
                        memo: params.memo || undefined,
                    },
                },
            });

            console.log('[WalletConnect] ✅ Transaction response:', result);
            const r = result as any;
            return r?.signedTransactionHash || r?.txId || r?.txid || '';
        } catch (err) {
            console.error('[WalletConnect] Transaction failed:', (err as Error).message);
            throw err;
        }
    }

    /**
     * Sign a message via the connected wallet.
     */
    async signMessage(message: string): Promise<string> {
        if (!this.session || !this.client) {
            throw new Error('No WalletConnect session active');
        }

        const result = await this.client.request({
            topic: this.session.topic,
            chainId: BCH_CHAIN_ID,
            request: {
                method: 'bch_signMessage',
                params: { message },
            },
        });

        return result as string;
    }

    /**
     * Disconnect the current session.
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
        this.client = null;
    }

    get isConnected(): boolean {
        return this.session !== null;
    }

    getAddress(): string | null {
        if (!this.session) return null;
        return this._extractAddress(this.session);
    }

    onSession(callback: (address: string) => void) {
        this._onSessionCallback = callback;
    }

    onDisconnect(callback: () => void) {
        this._onDisconnectCallback = callback;
    }
}

export const walletConnectService = new WalletConnectService();
