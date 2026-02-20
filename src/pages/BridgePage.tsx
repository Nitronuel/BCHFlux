import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowRight, History, Info } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useWalletStore } from '../store/walletStore';
import { WalletService } from '../services/WalletService';
import axios from 'axios';
import { useBridgeHistory } from '../hooks/useBridgeHistory';
import TransactionHistoryModal from '../components/bridge/TransactionHistoryModal';

const BridgePage: React.FC = () => {
    const { isConnected, balance } = useWalletStore();
    const [amount, setAmount] = useState<string>('');

    // Token State
    const [toToken, setToToken] = useState<string>('PEPE');
    const [toChain, setToChain] = useState<string>('SOLANA');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    // History State
    const { history, addTransaction, clearHistory } = useBridgeHistory();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);

    // Mock Token List
    const SUPPORTED_ASSETS = [
        { symbol: 'PEPE', chain: 'SOLANA', icon: 'https://cryptologos.cc/logos/pepe-pepe-logo.png', color: 'text-green-500' },
        { symbol: 'SOL', chain: 'SOLANA', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', color: 'text-purple-500' },
        { symbol: 'ETH', chain: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', color: 'text-blue-500' },
        { symbol: 'USDC', chain: 'ETH', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', color: 'text-blue-400' },
        { symbol: 'BNB', chain: 'BSC', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', color: 'text-yellow-500' },
    ];

    const handleGetQuote = async (isSilent = false) => {
        if (!amount || parseFloat(amount) <= 0) return;
        if (!isSilent) setLoading(true);
        try {
            // Call backend for quote
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/bridge/quote`, {
                amount: parseFloat(amount),
                toToken,
                toChain
            });
            setQuote(res.data);
        } catch (err) {
            console.error(err);
            if (!isSilent) alert('Failed to get quote');
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    // Auto-poll for quotes
    useEffect(() => {
        // Only start polling if we have a valid amount and haven't started a swap
        if (amount && parseFloat(amount) > 0 && !txId) {
            // Get initial quote immediately if not already fetching
            if (!quote && !loading) {
                handleGetQuote(false);
            }

            // Set up polling interval (every 10 seconds)
            const intervalId = setInterval(() => {
                handleGetQuote(true); // Silent update (no loading spinner)
            }, 10000);

            return () => clearInterval(intervalId); // Cleanup on unmount or deps change
        } else {
            // Clear quote if amount is emptied
            if (!amount) setQuote(null);
        }
    }, [amount, toToken, toChain, txId]);

    const handleSwap = async () => {
        if (!quote || !isConnected) return;
        setLoading(true);
        try {
            // 2. Extract Memo
            const memo = quote.tx.memo || (quote.tx.opReturn?.data ? quote.tx.opReturn.data[0] : undefined);

            // 3. Sign & Send
            const tx = await WalletService.sendBch(quote.tx.to, { bch: quote.tx.value }, memo);
            setTxId(tx);

            // 4. Save to History
            addTransaction({
                txId: tx,
                fromToken: 'BCH',
                toToken,
                toChain,
                amountIn: parseFloat(amount),
                amountOut: quote.amountOut,
                explorerUrl: `https://blockchair.com/bitcoin-cash/transaction/${tx}`
            });

            setQuote(null);
            alert(`Swap Initiated! Tx: ${tx}`);

        } catch (err) {
            console.error(err);
            alert('Swap failed: ' + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const selectedAsset = SUPPORTED_ASSETS.find(a => a.symbol === toToken) || SUPPORTED_ASSETS[0];

    return (
        <Layout>
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-background relative">
                <div className="w-full max-w-md space-y-4">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold text-white">Bridge & Swap</h1>
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="p-2 hover:bg-surface rounded-full transition-colors relative"
                        >
                            <History className="w-5 h-5 text-text-secondary" />
                            {history.length > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                            )}
                        </button>
                    </div>

                    {/* Swap Card */}
                    <div className="bg-surface border border-border rounded-2xl p-4 shadow-xl">

                        {/* From */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-text-secondary">
                                <span>From</span>
                                <span>Balance: {balance.bch.toFixed(4)} BCH</span>
                            </div>
                            <div className="flex items-center gap-4 bg-background/50 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors focus-within:border-primary">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
                                    placeholder="0.00"
                                    className="bg-transparent text-2xl font-bold text-white outline-none w-full placeholder-text-disabled"
                                />
                                <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-border shrink-0">
                                    <img src="https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png" className="w-6 h-6" alt="BCH" />
                                    <span className="font-bold">BCH</span>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="relative h-8 flex items-center justify-center my-2">
                            <div className="absolute inset-x-0 h-[1px] bg-border"></div>
                            <button className="relative z-10 p-2 bg-surface border border-primary/50 rounded-full text-primary hover:scale-110 transition-transform">
                                <ArrowDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* To */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-text-secondary">
                                <span>To (Estimate)</span>
                                <span>Chain: {toChain}</span>
                            </div>
                            <div className="flex items-center gap-4 bg-background/50 p-3 rounded-xl border border-border">
                                <div className="text-2xl font-bold text-text-primary w-full">
                                    {quote ? quote.amountOut.toLocaleString() : '---'}
                                </div>

                                {/* Token Selector Button */}
                                <button
                                    onClick={() => setIsSelectorOpen(true)}
                                    className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-border shrink-0 hover:bg-border transition-colors"
                                >
                                    <img src={selectedAsset.icon} className="w-6 h-6 rounded-full" alt={selectedAsset.symbol} />
                                    <span className="font-bold">{selectedAsset.symbol}</span>
                                    <ArrowDown className="w-3 h-3 text-text-secondary" />
                                </button>
                            </div>
                        </div>

                        {/* Quote Info */}
                        {quote && (
                            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm space-y-1 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Rate</span>
                                    <span className="font-mono">1 BCH ≈ {(quote.amountOut / quote.amountIn).toLocaleString()} {toToken}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Bridge Fee</span>
                                    <span className="font-mono">~{quote.bridgeFee} BCH</span>
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={quote ? handleSwap : handleGetQuote}
                            disabled={loading || !isConnected}
                            className={`w-full mt-4 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                                ${!isConnected
                                    ? 'bg-surface border border-border text-text-disabled cursor-not-allowed'
                                    : quote
                                        ? 'bg-buy text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]'
                                        : 'bg-primary text-background hover:bg-primary/90'
                                }
                            `}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                </span>
                            ) : !isConnected ? (
                                "Connect Wallet to Swap"
                            ) : quote ? (
                                "Confirm Swap"
                            ) : (
                                "Get Quote"
                            )}
                        </button>
                    </div>

                    {/* Status */}
                    {txId && (
                        <div className="p-4 bg-buy/10 border border-buy/20 rounded-xl flex items-center gap-3 text-buy animate-in zoom-in">
                            <Info className="w-5 h-5 shrink-0" />
                            <div className="text-sm overflow-hidden">
                                <div className="font-bold">Swap Started!</div>
                                <div className="text-xs opacity-80 truncate">Tx: {txId}</div>
                            </div>
                            <a
                                href={`https://blockchair.com/bitcoin-cash/transaction/${txId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto p-2 hover:bg-buy/20 rounded-full"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    )}

                </div>

                {/* Token Selector Modal */}
                {isSelectorOpen && (
                    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="w-full max-w-sm bg-surface rounded-2xl border border-border overflow-hidden shadow-2xl relative">

                            <div className="p-4 border-b border-border flex justify-between items-center">
                                <h3 className="font-bold text-lg">Select Token</h3>
                                <button onClick={() => setIsSelectorOpen(false)} className="p-1 hover:bg-background rounded-full">
                                    <div className="w-6 h-6 flex items-center justify-center text-text-secondary">✕</div>
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto">
                                {SUPPORTED_ASSETS.map(asset => (
                                    <button
                                        key={asset.symbol}
                                        onClick={() => {
                                            setToToken(asset.symbol);
                                            setToChain(asset.chain);
                                            setQuote(null);
                                            setIsSelectorOpen(false);
                                        }}
                                        className="w-full p-4 flex items-center justify-between hover:bg-background transition-colors border-b border-border/50 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={asset.icon} className="w-8 h-8 rounded-full" alt={asset.symbol} />
                                            <div className="text-left">
                                                <div className="font-bold text-white">{asset.symbol}</div>
                                                <div className="text-xs text-text-secondary">{asset.chain}</div>
                                            </div>
                                        </div>
                                        {toToken === asset.symbol && (
                                            <div className="text-primary">✓</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Transaction History Modal */}
                <TransactionHistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    history={history}
                    onClear={clearHistory}
                />
            </div>
        </Layout>
    );
};

export default BridgePage;
