import React, { useState, useRef, useEffect } from 'react';
import { X, Wallet, Shield, Smartphone, ArrowRight, ArrowLeft, CheckCircle, Zap } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { useUserStore } from '../../store/userStore';
import { WalletService } from '../../services/WalletService';
import { walletConnectService } from '../../services/walletConnectService';
import QRCode from 'qrcode';

interface ConnectWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ isOpen, onClose }) => {
    const { setConnected, setBalance, setAccountMode: setWalletMode } = useWalletStore();
    const { setAccountMode } = useUserStore();
    const [error, setError] = useState<string | null>(null);
    const [wcUri, setWcUri] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [connectingMethod, setConnectingMethod] = useState<'local' | 'walletconnect' | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Render QR code when URI is available
    useEffect(() => {
        if (wcUri && canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, wcUri, {
                width: 280,
                margin: 2,
                color: {
                    dark: '#ffffff',
                    light: '#1a1a2e',
                },
            }).catch((err: Error) => {
                console.error('[QR] Failed to render:', err);
            });
        }
    }, [wcUri]);

    if (!isOpen) return null;

    const handleConnectLocal = async () => {
        try {
            setConnectingMethod('local');
            setError(null);

            const address = await WalletService.initLocalWallet();
            WalletService.setConnectionType('local');
            const balance = await WalletService.getBalance();

            setConnected(address, 'local');
            setBalance(balance.bch, balance.usd);

            // Show success screen with mode switch prompt
            setConnectedAddress(address);
            setShowSuccess(true);
        } catch (err) {
            console.error(err);
            setError('Failed to connect local wallet');
        } finally {
            setConnectingMethod(null);
        }
    };

    const handleConnectWalletConnect = async () => {
        try {
            setConnectingMethod('walletconnect');
            setError(null);

            // Initialize WalletConnect
            await walletConnectService.init();

            // Set up session callback before connecting
            walletConnectService.onSession((address: string) => {
                console.log('[Modal] WalletConnect session approved, address:', address);
                WalletService.setConnectionType('walletconnect');
                setConnected(address, 'walletconnect');
                setBalance(0, 0);
                setConnectingMethod(null);
                // Show success screen with mode switch prompt
                setConnectedAddress(address);
                setShowQR(false);
                setShowSuccess(true);
            });

            walletConnectService.onDisconnect(() => {
                console.log('[Modal] WalletConnect disconnected');
                useWalletStore.getState().disconnect();
            });

            // Get pairing URI
            const uri = await walletConnectService.connect();
            if (uri) {
                setWcUri(uri);
                setShowQR(true);
            }

            setConnectingMethod(null);
        } catch (err: any) {
            console.error('[WalletConnect]', err);
            setError(err?.message || 'Failed to initialize WalletConnect. Please check your network connection.');
            setConnectingMethod(null);
        }
    };

    const handleBackToOptions = () => {
        walletConnectService.cancelPending();
        setShowQR(false);
        setWcUri(null);
        setError(null);
    };

    const handleSwitchToLive = () => {
        setAccountMode('real');
        setWalletMode('real');
        onClose();
        setShowSuccess(false);
        setConnectedAddress(null);
    };

    const handleStayDemo = () => {
        // Stay in demo mode, wallet remains connected for later
        onClose();
        setShowSuccess(false);
        setConnectedAddress(null);
    };

    const formatAddr = (addr: string) => {
        const clean = addr.replace('bitcoincash:', '');
        return `${clean.substring(0, 10)}...${clean.substring(clean.length - 6)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {showQR ? (
                            <button onClick={handleBackToOptions} className="p-1 hover:bg-hover rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-primary" />
                            </button>
                        ) : (
                            <Wallet className="w-5 h-5 text-primary" />
                        )}
                        {showQR ? 'Scan with Wallet' : 'Connect Wallet'}
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

                    {showSuccess && connectedAddress ? (
                        /* Success view — prompt to switch to Live mode */
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-text-primary mb-1">Wallet Connected!</h3>
                                <p className="text-sm text-text-secondary font-mono">{formatAddr(connectedAddress)}</p>
                            </div>

                            <div className="w-full space-y-3 mt-2">
                                <button
                                    onClick={handleSwitchToLive}
                                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    Switch to Live Mode
                                </button>
                                <button
                                    onClick={handleStayDemo}
                                    className="w-full py-3 bg-surface border border-border text-text-secondary font-medium rounded-xl hover:bg-hover transition-colors"
                                >
                                    Stay in Demo Mode
                                </button>
                            </div>

                            <p className="text-xs text-text-disabled text-center">
                                You can switch between Demo and Live mode anytime from the header.
                            </p>
                        </div>
                    ) :

                        showQR ? (
                            /* QR Code View */
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-background/50 p-4 rounded-2xl border border-border">
                                    <canvas ref={canvasRef} className="rounded-lg" />
                                </div>

                                <div className="text-center space-y-2">
                                    <p className="text-sm text-text-secondary">
                                        Open <span className="text-primary font-semibold">Paytaca</span>,{' '}
                                        <span className="text-primary font-semibold">Zapit</span>, or{' '}
                                        <span className="text-primary font-semibold">Cashonize</span>
                                    </p>
                                    <p className="text-xs text-text-disabled">
                                        Go to Settings → WalletConnect → Scan QR Code
                                    </p>
                                </div>

                                {/* Waiting indicator */}
                                <div className="flex items-center gap-2 text-sm text-text-secondary">
                                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    Waiting for connection...
                                </div>

                                {/* Copy URI Button */}
                                {wcUri && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(wcUri);
                                            alert('URI copied! Paste in your wallet app.');
                                        }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Copy connection link instead
                                    </button>
                                )}
                            </div>
                        ) :
                            /* Wallet Options View */
                            <div className="grid gap-3">
                                {/* Option 1: Browser Wallet (Internal) */}
                                <button
                                    onClick={handleConnectLocal}
                                    disabled={connectingMethod !== null}
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
                                    {connectingMethod === 'local' ? (
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <ArrowRight className="w-4 h-4 text-text-disabled group-hover:text-primary transition-colors" />
                                    )}
                                </button>

                                {/* Option 2: WalletConnect (External) */}
                                <button
                                    onClick={handleConnectWalletConnect}
                                    disabled={connectingMethod !== null}
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
                                    {connectingMethod === 'walletconnect' ? (
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <ArrowRight className="w-4 h-4 text-text-disabled group-hover:text-blue-500 transition-colors" />
                                    )}
                                </button>
                            </div>
                    }

                    <div className="text-center text-xs text-text-disabled mt-4">
                        By connecting, you agree to our Terms of Service.
                        <br />
                        Your keys are stored locally on your device.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectWalletModal;
