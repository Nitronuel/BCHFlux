import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatPrice } from '../../../utils/format';

interface OrderBookProps {
    bids?: { price: number; amount: number; total: number }[];
    asks?: { price: number; amount: number; total: number }[];
    currentPrice?: number;
}

interface OrderBookItem {
    price: number;
    amount: number;
    total: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ bids = [], asks = [], currentPrice = 43250.00 }) => {
    const [simulatedBids, setSimulatedBids] = useState<OrderBookItem[]>([]);
    const [simulatedAsks, setSimulatedAsks] = useState<OrderBookItem[]>([]);
    const lastPriceRef = useRef(currentPrice);

    // Simulation Logic
    useEffect(() => {
        // Initial Generation
        const generateData = (basePrice: number) => {
            const spread = basePrice * 0.0005; // 0.05% spread

            const newBids: OrderBookItem[] = Array.from({ length: 15 }).map((_, i) => {
                const price = basePrice - spread - (i * (basePrice * 0.0002));
                const amount = Math.random() * 1.5 + 0.1;
                return { price, amount, total: 0 }; // Total calc later
            });

            const newAsks: OrderBookItem[] = Array.from({ length: 15 }).map((_, i) => {
                const price = basePrice + spread + (i * (basePrice * 0.0002));
                const amount = Math.random() * 1.5 + 0.1;
                return { price, amount, total: 0 };
            });

            // Calculate Accumulated Totals
            let bidTotal = 0;
            newBids.forEach(b => { bidTotal += b.amount; b.total = bidTotal; });

            let askTotal = 0;
            newAsks.forEach(a => { askTotal += a.amount; a.total = askTotal; });

            return { bids: newBids, asks: newAsks.reverse() }; // Asks usually displayed high to low (top of list is lowest sell price)
            // Actually standard UI: Asks (Red) on top, Bids (Green) on bottom.
            // Asks list: Lowest Ask (best price) should be at the BOTTOM of the red section (closest to current price).
            // Bids list: Highest Bid (best price) should be at the TOP of the green section.
        };

        const { bids: initBids, asks: initAsks } = generateData(currentPrice);
        setSimulatedBids(initBids);
        setSimulatedAsks(initAsks);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount for pure init, updates handled below

    // Dynamic Updates
    useEffect(() => {
        const interval = setInterval(() => {
            setSimulatedBids(prev => {
                return prev.map(item => ({
                    ...item,
                    amount: Math.random() > 0.7 ? Math.random() * 2 : item.amount, // Occasional amount change
                    price: currentPrice !== lastPriceRef.current ? item.price + (currentPrice - lastPriceRef.current) : item.price // Shift if price changed
                }));
            });

            setSimulatedAsks(prev => {
                return prev.map(item => ({
                    ...item,
                    amount: Math.random() > 0.7 ? Math.random() * 2 : item.amount,
                    price: currentPrice !== lastPriceRef.current ? item.price + (currentPrice - lastPriceRef.current) : item.price
                }));
            });

            lastPriceRef.current = currentPrice;
        }, 1000);

        return () => clearInterval(interval);
    }, [currentPrice]);

    const displayBids = bids.length ? bids : simulatedBids;
    // For Asks, we want the Lowest Price (Best Ask) to be visually at the bottom of the list
    // if we are rendering flex-col.
    // If we render list 0..N, 0 is top.
    // Standard Order Book:
    // [High Ask]
    // ...
    // [Low Ask]
    // [Price]
    // [High Bid]
    // ...
    // [Low Bid]

    // So 'simulatedAsks' constructed as [Lowest Ask, ..., Highest Ask] needs to be reversed for display
    // WAIT. standard array is [0, 1, 2]. 
    // If I generated [Lowest, ..., Highest], then I should reverse it to show Highest at top.
    const displayAsks = asks.length ? asks : [...simulatedAsks].reverse();

    // Re-calc totals for visualizations after updates
    const accumulatedBids = useMemo(() => {
        let t = 0;
        const result: OrderBookItem[] = [];
        displayBids.forEach(b => {
            t += b.amount;
            result.push({ ...b, total: t });
        });
        return result;
    }, [displayBids]);

    const accumulatedAsks = useMemo(() => {
        let t = 0;
        // visual display is usually accumulated from the spread outwards.
        // For Asks (Red), the one closest to spread has smallest total.
        // Since displayAsks is reversed (Highest...Lowest), we need to be careful.
        // Let's calc totals on the sorted list (Lowest...Highest) then reverse back.
        const sorted = [...displayAsks].sort((a, b) => a.price - b.price);
        const result: OrderBookItem[] = [];
        sorted.forEach(a => {
            t += a.amount;
            result.push({ ...a, total: t });
        });
        return result.reverse();
    }, [displayAsks]);


    const maxTotal = Math.max(
        (accumulatedBids[accumulatedBids.length - 1]?.total || 1),
        (accumulatedAsks[0]?.total || 1) // First item in reversed list has max total? No, first item is Highest Price (Max Total).
    );

    return (
        <div className="flex flex-col h-full bg-surface text-xs overflow-hidden font-mono">
            <div className="px-3 py-2 border-b border-border flex justify-between items-center text-text-secondary text-[10px] uppercase tracking-wider">
                <span>Price(USDT)</span>
                <span>Amount</span>
                <span>Total</span>
            </div>

            {/* Asks (Sell Orders) - Red */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end pb-1">
                {accumulatedAsks.map((ask: OrderBookItem, i: number) => (
                    <div key={i} className="flex relative items-center justify-between px-3 py-[2px] hover:bg-hover cursor-pointer group">
                        <div
                            className="absolute right-0 top-0 bottom-0 bg-sell opacity-[0.15]"
                            style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                        ></div>
                        <span className="z-10 text-sell group-hover:font-bold">{formatPrice(ask.price)}</span>
                        <span className="z-10 text-text-primary opacity-80">{ask.amount.toFixed(4)}</span>
                        <span className="z-10 text-text-disabled text-[10px]">{ask.total.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            {/* Current Price Indicator */}
            <div className="px-3 py-3 text-lg font-bold flex items-center justify-center gap-2 border-y border-border bg-background/50">
                <span className={currentPrice >= lastPriceRef.current ? "text-buy" : "text-sell"}>
                    {formatPrice(currentPrice)}
                </span>
                {currentPrice >= lastPriceRef.current ?
                    <ArrowUp className="w-4 h-4 text-buy" /> :
                    <ArrowDown className="w-4 h-4 text-sell" />
                }
            </div>

            {/* Bids (Buy Orders) - Green */}
            <div className="flex-1 overflow-hidden pt-1">
                {accumulatedBids.map((bid: OrderBookItem, i: number) => (
                    <div key={i} className="flex relative items-center justify-between px-3 py-[2px] hover:bg-hover cursor-pointer group">
                        <div
                            className="absolute right-0 top-0 bottom-0 bg-buy opacity-[0.15]"
                            style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                        ></div>
                        <span className="z-10 text-buy group-hover:font-bold">{formatPrice(bid.price)}</span>
                        <span className="z-10 text-text-primary opacity-80">{bid.amount.toFixed(4)}</span>
                        <span className="z-10 text-text-disabled text-[10px]">{bid.total.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderBook;
