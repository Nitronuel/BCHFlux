import React, { useState } from 'react';
import { X } from 'lucide-react';

interface OrderDetails {
    side: 'buy' | 'sell';
    type: string;
    price: string;
    amount: string;
    total: string;
    leverage?: number;
    baseSymbol: string;
    quoteSymbol: string;
    // Cross-Chain Fields
    isCrossChain?: boolean;
    bchCost?: string;
    gasAirdrop?: string;

    targetChain?: string;
    marginAsset?: string;
    marginAmount?: string;
}

interface OrderConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    details: OrderDetails;
    variant: 'spot' | 'futures';
    pair?: string;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    details,
    variant,
    pair = 'BTC/USDT'
}) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen) return null;

    const isBuy = details.side === 'buy';
    const isFutures = variant === 'futures';

    // Mock calculations
    const priceNum = parseFloat(details.price) || 0;
    const leverage = details.leverage || 1;

    // Liquidation price calculation (Mock logic)
    const liquidationPrice = isFutures
        ? (isBuy
            ? priceNum * (1 - 1 / leverage + 0.005)
            : priceNum * (1 + 1 / leverage - 0.005)
        ).toFixed(2)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#15191D] border border-border/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 pb-0">
                    <h3 className="text-xl font-bold text-white">Confirm Order</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Pair & Side Badge */}
                    <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${isBuy ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'}`}>
                            {isBuy ? 'Buy' : 'Sell'} {isFutures && (isBuy ? '/ Long' : '/ Short')}
                        </div>
                        <div className="text-xl font-bold text-white">
                            {pair}
                        </div>
                    </div>

                    {/* Details Box */}
                    <div className="bg-[#1E2329] rounded-lg p-5 space-y-4">
                        {details.isCrossChain ? (
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Destination Network</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${details.targetChain === 'Solana' ? 'bg-[#14F195]' : 'bg-[#627EEA]'}`}></span>
                                        <span className="font-bold text-white">{details.targetChain}</span>
                                    </div>
                                </div>

                                <div className="h-px bg-border/50 my-2" />

                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">You Send (Total)</span>
                                    <div className="text-right">
                                        <div className="font-bold text-[#0AC18E] text-lg">{details.bchCost} BCH</div>
                                        <div className="text-xs text-text-secondary">≈ ${details.total} USDT</div>
                                    </div>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">You Receive</span>
                                    <div className="text-right">
                                        <div className="font-bold text-white">{details.amount} {pair.split('/')[0]}</div>
                                        {details.gasAirdrop && (
                                            <div className="text-xs text-[#0AC18E] flex items-center justify-end gap-1">
                                                <span>+ {details.gasAirdrop} (Gas Airdrop)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>


                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Order Type</span>
                                    <span className="font-medium text-white">{details.type}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Price</span>
                                    <span className="font-medium text-white">{priceNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Position Size</span>
                                    <span className="font-medium text-white">{details.amount} {details.baseSymbol}</span>
                                </div>

                                <div className="h-px bg-border/50 my-2" />

                                {isFutures ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Margin Cost</span>
                                            <span className="font-medium text-white">
                                                {details.marginAmount ? `${details.marginAmount} ${details.marginAsset}` : `${details.total} USDT`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Notional Value</span>
                                            <span className="font-medium text-text-secondary">{details.total} USDT</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Total Cost</span>
                                        <span className="font-medium text-white">{details.total} USDT</span>
                                    </div>
                                )}

                                {isFutures && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Leverage</span>
                                            <span className="font-medium text-white">{leverage}x</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Estimated Liq. Price</span>
                                            <span className="font-medium text-sell">{parseFloat(liquidationPrice || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>


                    {/* Do not show again */}
                    <div className="flex items-center gap-2">
                        <div
                            className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-primary border-primary' : 'border-text-secondary bg-transparent'}`}
                            onClick={() => setDontShowAgain(!dontShowAgain)}
                        >
                            {dontShowAgain && <div className="w-2 h-2 bg-black rounded-sm" />}
                        </div>
                        <span className="text-sm text-text-secondary cursor-pointer select-none" onClick={() => setDontShowAgain(!dontShowAgain)}>
                            Do not show again for this session
                        </span>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-lg font-bold text-white bg-[#2B3036] hover:bg-[#363C44] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90 ${isBuy ? 'bg-[#2EBD85]' : 'bg-[#F6465D]'}`}
                        >
                            Confirm {isBuy ? 'Long' : 'Short'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationModal;
