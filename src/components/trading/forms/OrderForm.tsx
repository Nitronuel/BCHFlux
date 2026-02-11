import React, { useState, useEffect } from 'react';
import OrderConfirmationModal from '../modals/OrderConfirmationModal';
import { useUserStore } from '../../../store/userStore';
import { useUiStore } from '../../../store/uiStore';
import { usePriceStore } from '../../../store/priceStore'; // For live BCH price
import { ArrowRightLeft } from 'lucide-react';

interface OrderFormProps {
    variant?: 'spot' | 'futures';
    leverage?: number;
    currentPrice?: number;
    baseSymbol?: string;
    quoteSymbol?: string;
    chainId?: string; // Added chainId
}

interface PendingOrder {
    side: 'buy' | 'sell';
    type: 'Limit' | 'Market' | 'Stop Limit';
    price: string;
    amount: string;
    total: string;
    leverage: number;
    baseSymbol: string;
    quoteSymbol: string;
    stopPrice?: string;
    triggerCondition?: 'Above' | 'Below';
    // Cross-Chain Fields
    isCrossChain?: boolean;
    bchCost?: string;
    gasAirdrop?: string;
    destinationAddress?: string;
    targetChain?: string;
}

const OrderForm: React.FC<OrderFormProps> = ({
    variant = 'spot',
    leverage = 1,
    currentPrice,
    baseSymbol = 'BTC',
    quoteSymbol = 'USDT',
    chainId
}) => {
    const { balances, addOrder } = useUserStore();
    const { addToast } = useUiStore();
    const { prices } = usePriceStore(); // Get live prices

    // Get live BCH price (fallback to $400 if missing, but should be live)
    const bchPrice = prices['bitcoin-cash']?.usd || 400;

    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'Limit' | 'Market' | 'Stop Limit'>('Limit');
    const [price, setPrice] = useState(currentPrice?.toFixed(2) || '43250.00');
    const [stopPrice, setStopPrice] = useState('');
    const [amount, setAmount] = useState('0.5');
    const [bchAmount, setBchAmount] = useState(''); // For cross-chain BCH input

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);

    // Cross-Chain Detection
    const isCrossChain = variant === 'spot' && !!chainId && chainId !== 'bitcoin-cash' && chainId !== 'bitcoin';
    const targetChain = chainId ? chainId.charAt(0).toUpperCase() + chainId.slice(1) : 'Unknown';

    // Get BCH Price for Cross-Chain Calcs
    // const bchPrice = markets.find(m => m.id === 'bitcoin-cash')?.current_price || 400;

    // Check if user has tokens to sell (for cross-chain)
    const tokenBalance = balances[baseSymbol]?.available || 0;
    const canSellCrossChain = isCrossChain && tokenBalance > 0;

    // Cross-Chain Conversion Functions
    // Pricing Engine: Calculate Cross-Rate
    // Rate = BCH_PRICE / TOKEN_PRICE
    const tokenToBCH = (tokenAmt: number): number => {
        const tokenPriceUSD = currentPrice || 0;
        if (bchPrice <= 0 || tokenPriceUSD <= 0) return 0;

        // Value: (TokenAmt * TokenPrice) / BCHPrice
        const rawBch = (tokenAmt * tokenPriceUSD) / bchPrice;

        // Apply 1% Safety Spread/Fee
        return side === 'buy'
            ? rawBch * 1.01  // Buy: Pay 1% more BCH
            : rawBch * 0.99; // Sell: Receive 1% less BCH
    };

    const bchToToken = (bchAmt: number): number => {
        const tokenPriceUSD = currentPrice || 0;
        if (tokenPriceUSD <= 0 || bchPrice <= 0) return 0;

        // Value: (BchAmt * BCHPrice) / TokenPrice
        const rawTokens = (bchAmt * bchPrice) / tokenPriceUSD;

        // Apply 1% Safety Spread/Fee (Inverse)
        return side === 'buy'
            ? rawTokens / 1.01 // Buy: Get less tokens for same BCH
            : rawTokens / 0.99; // Sell: Need more tokens to get same BCH
    };

    // Handlers for bidirectional input
    const handleTokenAmountChange = (value: string) => {
        setAmount(value);
        if (isCrossChain && value) {
            const tokenAmt = parseFloat(value) || 0;
            const bch = tokenToBCH(tokenAmt);
            setBchAmount(bch > 0 ? bch.toFixed(5) : '');
        } else if (!value) {
            setBchAmount('');
        }
    };

    const handleBchAmountChange = (value: string) => {
        setBchAmount(value);
        if (isCrossChain && value) {
            const bchAmt = parseFloat(value) || 0;
            const tokens = bchToToken(bchAmt);
            setAmount(tokens > 0 ? tokens.toFixed(4) : '');
        } else if (!value) {
            setAmount('');
        }
    };

    // Percentage slider for BCH (cross-chain)
    const handleBchPercentage = (percentage: number) => {
        const maxBch = balances['BCH']?.available || 0;
        const bch = maxBch * percentage * 0.99; // 1% buffer
        handleBchAmountChange(bch.toFixed(5));
    };

    // Calculate BCH cost for display (derived from current amount)
    const bchCost = isCrossChain && amount ? tokenToBCH(parseFloat(amount) || 0) : 0;

    // Effects
    useEffect(() => {
        if (currentPrice && currentPrice > 0) {
            setPrice(currentPrice.toFixed(2));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseSymbol]);

    useEffect(() => {
        if (isCrossChain) {
            setOrderType('Market');
            setSide('buy');
        }
    }, [isCrossChain]);

    const handleOrderClick = () => {
        if (!amount) return;
        if (!isCrossChain && orderType !== 'Market' && !price) return;
        if (orderType === 'Stop Limit' && !stopPrice) return;



        let total = '0';
        let bchCostStr = '0';
        let gasAirdrop = '';

        if (isCrossChain) {
            // Swap Logic - Use pre-calculated bchCost
            const totalUSD = parseFloat(amount) * (currentPrice || 0);

            total = totalUSD.toFixed(2);
            bchCostStr = bchCost.toFixed(5);

            if (chainId === 'solana') gasAirdrop = '0.02 SOL';
            else if (chainId === 'ethereum') gasAirdrop = '0.005 ETH';
            else if (chainId === 'base') gasAirdrop = '0.002 ETH';
            else gasAirdrop = 'Native Gas';
        } else {
            // Standard Logic
            const p = orderType === 'Market' ? (currentPrice || 0) : parseFloat(price);
            total = (parseFloat(amount) * p).toFixed(2);
        }

        // Determine Trigger Condition
        let condition: 'Above' | 'Below' | undefined;
        if (orderType === 'Stop Limit' && currentPrice) {
            const sp = parseFloat(stopPrice);
            condition = sp > currentPrice ? 'Above' : 'Below';
        }

        setPendingOrder({
            side,
            type: orderType,
            price: (orderType === 'Market' || isCrossChain) ? (currentPrice?.toString() || '0') : price,
            stopPrice,
            triggerCondition: condition,
            amount,
            total,
            leverage,
            baseSymbol,
            quoteSymbol: isCrossChain ? 'BCH' : quoteSymbol,
            isCrossChain,
            bchCost: bchCostStr,
            gasAirdrop,

            targetChain
        });
        setIsModalOpen(true);
    };

    // Determine available balance
    const availCurrency = isCrossChain
        ? (side === 'buy' ? 'BCH' : baseSymbol)
        : (side === 'buy' ? quoteSymbol : baseSymbol);
    const availBalance = balances[availCurrency]?.available || 0;

    const handleConfirmOrder = async () => {
        if (!pendingOrder) return;

        // --- Cross-Chain Execution Flow ---
        if (pendingOrder.isCrossChain) {
            const amountNum = parseFloat(pendingOrder.amount);

            if (pendingOrder.side === 'buy') {
                // BUY: BCH -> Token
                const cost = parseFloat(pendingOrder.bchCost || '0');
                if (availBalance < cost) {
                    addToast('Insufficient BCH Balance!', 'error');
                    setIsModalOpen(false);
                    return;
                }

                const effectivePrice = cost / amountNum;
                const newOrder = {
                    id: Math.random().toString(36).substr(2, 9),
                    symbol: `${baseSymbol.toUpperCase()}/BCH`,
                    side: 'buy' as const,
                    type: 'Market' as const,
                    price: effectivePrice,
                    amount: amountNum,
                    total: cost,
                    timestamp: Date.now(),
                    status: 'Open' as const,
                    variant: 'spot' as const,
                };

                const success = await addOrder(newOrder);
                if (!success) {
                    addToast('Failed to place order (Insufficient funds?)', 'error');
                    setIsModalOpen(false);
                    return;
                }

                addToast('Transaction Broadcasted on Bitcoin Cash Network...', 'info');
                setIsModalOpen(false);
                setAmount('');

                setTimeout(() => {
                    addToast('⚡ Bridge Activated: Swapping BCH -> tokens...', 'info');
                    const { fillOrder } = useUserStore.getState();
                    fillOrder(newOrder.id, effectivePrice, amountNum);
                    addToast(`Success! ${pendingOrder.amount} ${baseSymbol} has been added to your wallet!`, 'success');
                }, 3000);

            } else {
                // SELL: Token -> BCH
                const tokenBal = balances[baseSymbol]?.available || 0;
                if (tokenBal < amountNum) {
                    addToast(`Insufficient ${baseSymbol} Balance!`, 'error');
                    setIsModalOpen(false);
                    return;
                }

                // Revenue = Token Amount * Token Price / BCH Price
                const tokenPrice = currentPrice || 0;
                const revenueUSD = amountNum * tokenPrice;
                const revenueInBCH = (revenueUSD * 0.99) / bchPrice; // 1% fee
                const effectivePrice = revenueInBCH / amountNum;

                const newOrder = {
                    id: Math.random().toString(36).substr(2, 9),
                    symbol: `${baseSymbol.toUpperCase()}/BCH`,
                    side: 'sell' as const,
                    type: 'Market' as const,
                    price: effectivePrice,
                    amount: amountNum,
                    total: revenueInBCH,
                    timestamp: Date.now(),
                    status: 'Open' as const,
                    variant: 'spot' as const,
                };

                const success = addOrder(newOrder);
                if (!success) {
                    addToast('Failed to place order (Insufficient tokens?)', 'error');
                    setIsModalOpen(false);
                    return;
                }

                addToast('Transaction Broadcasted: Selling tokens...', 'info');
                setIsModalOpen(false);
                setAmount('');

                setTimeout(() => {
                    addToast('⚡ Bridge Activated: Swapping tokens -> BCH...', 'info');
                    const { fillOrder } = useUserStore.getState();
                    fillOrder(newOrder.id, effectivePrice, amountNum);
                    addToast(`Success! ${revenueInBCH.toFixed(5)} BCH has been added to your wallet!`, 'success');
                }, 3000);
            }

            return;
        }

        // --- Standard Order Flow ---
        if (variant === 'futures') {
            const { openPosition, addOrder } = useUserStore.getState();
            if (orderType === 'Market') {
                const orderPrice = currentPrice;
                if (!orderPrice || orderPrice <= 0) return;
                const success = openPosition({
                    symbol: baseSymbol,
                    side: side === 'buy' ? 'Long' : 'Short',
                    size: parseFloat(amount),
                    leverage,
                    entryPrice: orderPrice,
                    margin: (orderPrice * parseFloat(amount)) / leverage,
                    liquidationPrice: side === 'buy'
                        ? orderPrice * (1 - 0.9 / leverage)
                        : orderPrice * (1 + 0.9 / leverage)
                });
                if (success) {
                    addToast(`${side === 'buy' ? 'Long' : 'Short'} Position Opened`, 'success');
                    setAmount('');
                } else {
                    addToast('Insufficient Margin', 'error');
                }
            } else {
                const orderPrice = parseFloat(price);
                if (!orderPrice || orderPrice <= 0) return;
                const newOrder = {
                    id: Math.random().toString(36).substr(2, 9),
                    symbol: `${baseSymbol.toUpperCase()}/${quoteSymbol.toUpperCase()}`,
                    side: side,
                    type: orderType,
                    price: orderPrice,
                    amount: parseFloat(amount),
                    total: parseFloat(amount) * orderPrice,
                    timestamp: Date.now(),
                    status: 'Open' as const,
                    variant: 'futures' as const,
                    leverage: leverage,
                    stopPrice: orderType === 'Stop Limit' ? parseFloat(pendingOrder?.stopPrice || '0') : undefined,
                    triggerCondition: pendingOrder?.triggerCondition
                };
                const success = await addOrder(newOrder);
                if (success) {
                    addToast(orderType === 'Stop Limit' ? 'Stop Limit Order Placed' : 'Limit Order Placed', 'success');
                    setAmount('');
                    setStopPrice('');
                } else {
                    addToast('Insufficient Margin', 'error');
                }
            }
            setIsModalOpen(false);
            return;
        }

        // Spot Order
        const newOrder = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: `${baseSymbol.toUpperCase()}/${quoteSymbol.toUpperCase()}`,
            side: side,
            type: orderType,
            price: parseFloat(price),
            amount: parseFloat(amount),
            total: parseFloat(amount) * parseFloat(price),
            timestamp: Date.now(),
            status: 'Open' as const,
            stopPrice: orderType === 'Stop Limit' ? parseFloat(pendingOrder?.stopPrice || '0') : undefined,
            triggerCondition: pendingOrder?.triggerCondition
        };

        const success = await addOrder(newOrder);
        if (success) {
            addToast('Order placed successfully!', 'success');
            setIsModalOpen(false);
            setAmount('');
            if (orderType === 'Market' && currentPrice) {
                const { fillOrder } = useUserStore.getState();
                fillOrder(newOrder.id, currentPrice, newOrder.amount);
                addToast(`Market Order Filled @ ${currentPrice}`, 'success');
            }
        } else {
            addToast('Insufficient Balance!', 'error');
            setIsModalOpen(false);
        }
    };

    const handleSliderChange = (percentage: number) => {
        if (isCrossChain) {
            const maxBch = availBalance;
            const bchPriceNum = bchPrice;
            const tokenPrice = currentPrice || 1;
            const maxToken = (maxBch * bchPriceNum) / tokenPrice;
            setAmount((maxToken * percentage * 0.99).toFixed(4));
            return;
        }

        if (side === 'buy') {
            const available = balances[quoteSymbol]?.available || 0;
            const purchasingPower = variant === 'futures' ? available * leverage : available;
            const targetPrice = parseFloat(price) || currentPrice || 0;
            if (targetPrice > 0) {
                const max = purchasingPower / targetPrice;
                setAmount((max * percentage * 0.99).toFixed(4));
            }
        } else {
            if (variant === 'futures') {
                const available = balances['USDT']?.available || 0;
                const purchasingPower = available * leverage;
                const targetPrice = parseFloat(price) || currentPrice || 0;
                if (targetPrice > 0) {
                    const max = purchasingPower / targetPrice;
                    setAmount((max * percentage * 0.99).toFixed(4));
                }
            } else {
                const available = balances[baseSymbol]?.available || 0;
                setAmount((available * percentage).toFixed(4));
            }
        }
    };

    return (
        <div className="p-4 bg-surface h-full flex flex-col text-sm">
            {/* Side Toggles */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setSide('buy')}
                    disabled={isCrossChain} // Lock to buy for now
                    className={`flex-1 py-1.5 rounded font-medium transition-colors ${side === 'buy' ? 'bg-buy text-white' : 'bg-border text-text-secondary hover:text-text-primary'} ${isCrossChain ? 'opacity-100' : ''}`}
                >
                    {variant === 'futures' ? 'Long' : (isCrossChain ? 'Buy & Bridge' : 'Buy')}
                </button>
                <button
                    onClick={() => setSide('sell')}
                    disabled={isCrossChain && !canSellCrossChain}
                    className={`flex-1 py-1.5 rounded font-medium transition-colors ${side === 'sell' ? 'bg-sell text-white' : 'bg-border text-text-secondary hover:text-text-primary'} ${isCrossChain && !canSellCrossChain ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {variant === 'futures' ? 'Short' : 'Sell'}
                </button>
            </div>

            {/* Order Types */}
            <div className="flex gap-4 mb-4 text-text-secondary font-medium">
                {(['Limit', 'Market', 'Stop Limit'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        disabled={isCrossChain && type !== 'Market'}
                        className={`hover:text-primary ${orderType === type ? 'text-primary' : ''} ${isCrossChain && type !== 'Market' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <div className="flex-1 space-y-4">
                {/* Stop Price Input */}
                {orderType === 'Stop Limit' && (
                    <div>
                        <div className="flex justify-between text-xs text-text-secondary mb-1">
                            <span>Stop Price ({quoteSymbol})</span>
                        </div>
                        <div className="relative group">
                            <input
                                type="text"
                                value={stopPrice}
                                onChange={e => setStopPrice(e.target.value)}
                                className="w-full bg-background border border-border rounded px-3 py-2.5 text-right text-text-primary focus:border-primary outline-none transition-colors"
                            />
                            <span className="absolute left-3 top-2.5 text-text-disabled">Trigger</span>
                            <span className="absolute right-10 top-2.5 text-text-disabled">{quoteSymbol}</span>
                        </div>
                    </div>
                )}

                {/* Price Input */}
                <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                        <span>Price ({quoteSymbol})</span>
                    </div>
                    {orderType === 'Market' ? (
                        <div className="w-full bg-background border border-border rounded px-3 py-2.5 text-center text-text-disabled italic">
                            Market Price
                        </div>
                    ) : (
                        <div className="relative group">
                            <input
                                type="text"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full bg-background border border-border rounded px-3 py-2.5 text-right text-text-primary focus:border-primary outline-none transition-colors"
                            />
                            <span className="absolute left-3 top-2.5 text-text-disabled">Price</span>
                            <span className="absolute right-10 top-2.5 text-text-disabled">{quoteSymbol}</span>
                        </div>
                    )}
                </div>

                {/* Amount Input */}
                <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                        <span>Amount ({baseSymbol})</span>
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            value={amount}
                            onChange={e => isCrossChain ? handleTokenAmountChange(e.target.value) : setAmount(e.target.value)}
                            className="w-full bg-background border border-border rounded px-3 py-2.5 text-right text-text-primary focus:border-primary outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Slider - Only for non-cross-chain or when selling */}
                {!isCrossChain && (
                    <div className="py-2">
                        <div className="flex justify-between mt-1 text-xs text-text-disabled">
                            {[0.25, 0.50, 0.75, 1].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => handleSliderChange(pct)}
                                    className="hover:text-primary bg-border px-2 py-0.5 rounded"
                                >
                                    {pct * 100}%
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Total (BCH for cross-chain, quote for standard) */}
                <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                        <span>Total ({isCrossChain ? 'BCH' : quoteSymbol})</span>
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            readOnly={!isCrossChain}
                            value={
                                isCrossChain
                                    ? bchAmount
                                    : (amount && (price || currentPrice) ? (parseFloat(amount) * (parseFloat(price) || currentPrice || 0)).toFixed(2) : '-')
                            }
                            onChange={e => isCrossChain && handleBchAmountChange(e.target.value)}
                            className={`w-full bg-background border border-border rounded px-3 py-2.5 text-right text-text-primary outline-none ${isCrossChain ? 'focus:border-primary transition-colors' : ''}`}
                        />
                    </div>
                </div>

                {/* BCH Percentage Slider - Only for cross-chain buy */}
                {isCrossChain && side === 'buy' && (
                    <div className="py-2">
                        <div className="flex justify-between mt-1 text-xs text-text-disabled">
                            {[0.25, 0.50, 0.75, 1].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => handleBchPercentage(pct)}
                                    className="hover:text-primary bg-border px-2 py-0.5 rounded"
                                >
                                    {pct * 100}%
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Avail */}
                <div className="flex justify-between text-xs text-text-secondary">
                    <span>Avail</span>
                    <span>{availBalance.toFixed(4)} {availCurrency}</span>
                </div>

                <button
                    onClick={handleOrderClick}
                    className={`w-full py-3 rounded font-bold text-white mt-2 ${isCrossChain
                        ? (side === 'buy' ? 'bg-buy hover:bg-opacity-90' : 'bg-sell hover:bg-opacity-90')
                        : (side === 'buy' ? 'bg-buy hover:bg-opacity-90' : 'bg-sell hover:bg-opacity-90')
                        }`}
                >
                    {isCrossChain ? (
                        <div className="flex items-center justify-center gap-2">
                            <ArrowRightLeft className="w-4 h-4" />
                            {side === 'buy' ? `Bridge & Buy ${baseSymbol}` : `Sell ${baseSymbol} for BCH`}
                        </div>
                    ) : (
                        variant === 'futures'
                            ? (side === 'buy' ? `Long (${leverage}x)` : `Short (${leverage}x)`)
                            : (side === 'buy' ? 'Buy' : 'Sell')
                    )}
                </button>
            </div>

            {pendingOrder && (
                <OrderConfirmationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleConfirmOrder}
                    details={pendingOrder}
                    variant={variant}
                    pair={`${baseSymbol.toUpperCase()}/${quoteSymbol.toUpperCase()}`}
                />
            )}
        </div>
    );
};

export default OrderForm;
