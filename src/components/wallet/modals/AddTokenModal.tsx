import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clipboard, PlusCircle } from 'lucide-react';
import { fetchTokenByAddress } from '../../../services/dexScreener';
import { useMarketStore } from '../../../store/marketStore';
import type { MarketCoin } from '../../../services/api';

interface AddTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose }) => {
    const [contractAddress, setContractAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [foundToken, setFoundToken] = useState<MarketCoin | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState('base'); // Default to Base for demo

    const { addCustomToken } = useMarketStore();

    useEffect(() => {
        const fetchToken = async () => {
            if (contractAddress.length > 30) { // Basic length check
                setIsLoading(true);
                setError(null);
                setFoundToken(null);

                try {
                    const token = await fetchTokenByAddress(contractAddress);
                    if (token) {
                        setFoundToken(token);
                    } else {
                        setError('Token not found on DexScreener. Check address and try again.');
                    }
                } catch (err) {
                    setError('Failed to fetch token details.');
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setFoundToken(null);
                setError(null);
            }
        };

        const timeoutId = setTimeout(fetchToken, 800); // Debounce
        return () => clearTimeout(timeoutId);
    }, [contractAddress]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (foundToken) {
            // Mix in the user-selected network and contract address
            const enrichedToken: MarketCoin = {
                ...foundToken,
                // Use found chainId/pairAddress if available, otherwise fallback
                chainId: foundToken.chainId || selectedNetwork,
                pairAddress: foundToken.pairAddress || contractAddress,
                id: foundToken.id || contractAddress // Ensure ID exists
            };
            addCustomToken(enrichedToken);
            onClose();
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Add Custom Token</h2>
                            <p className="text-text-secondary text-sm mt-1">Import unlisted tokens to your wallet manually.</p>
                        </div>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="p-5 border border-border rounded-lg bg-background/50 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Network</label>
                            <div className="relative">
                                <select
                                    value={selectedNetwork}
                                    onChange={(e) => setSelectedNetwork(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-text-secondary transition-colors"
                                >
                                    <option value="ethereum">Ethereum (ERC-20)</option>
                                    <option value="bsc">BNB Smart Chain (BEP-20)</option>
                                    <option value="solana">Solana</option>
                                    <option value="polygon">Polygon</option>
                                    <option value="base">Base</option>
                                    <option value="arbitrum">Arbitrum</option>
                                </select>
                                <div className="absolute right-4 top-3.5 pointer-events-none text-text-secondary">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Contract Address</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={contractAddress}
                                    onChange={(e) => setContractAddress(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-text-primary focus:border-primary outline-none transition-colors group-hover:border-text-secondary focus:group-hover:border-primary"
                                />
                                <button
                                    className="absolute right-3 top-2.5 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                    title="Paste"
                                    onClick={async () => {
                                        try {
                                            const text = await navigator.clipboard.readText();
                                            setContractAddress(text);
                                        } catch (err) {
                                            console.error('Failed to read clipboard', err);
                                        }
                                    }}
                                >
                                    <Clipboard className="w-5 h-5" />
                                </button>
                                {isLoading && (
                                    <div className="absolute right-10 top-3 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                )}
                            </div>
                            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
                            <p className="text-xs text-text-disabled mt-1.5">Paste the token contract address to auto-fill details.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Token Symbol</label>
                                <input
                                    type="text"
                                    placeholder="e.g. USDC"
                                    value={foundToken?.symbol?.toUpperCase() || ''}
                                    readOnly
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary outline-none transition-colors opacity-70 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Token Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. USD Coin"
                                    value={foundToken?.name || ''}
                                    readOnly
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary outline-none transition-colors opacity-70 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {foundToken && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex gap-3 items-center">
                                <img src={foundToken.image} alt={foundToken.name} className="w-8 h-8 rounded-full" />
                                <div>
                                    <h4 className="text-sm font-bold text-green-500">Token Found!</h4>
                                    <p className="text-xs text-green-500/80">
                                        Price: ${foundToken.current_price.toFixed(6)} | Vol: ${(foundToken.total_volume / 1000).toFixed(1)}K
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-500 mb-1">Verify Contract Address</h4>
                                <p className="text-xs text-yellow-500/80 leading-relaxed">
                                    Anyone can create a token, including fake versions. Ensure the contract address matches the official project documentation.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-background border border-border text-text-primary font-bold rounded-lg hover:bg-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!foundToken}
                            className="flex-1 py-3.5 bg-buy text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Add Custom Token
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddTokenModal;
