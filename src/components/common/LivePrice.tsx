import React, { useEffect, useState } from 'react';
import { usePriceStore } from '../../store/priceStore';

interface LivePriceProps {
    coinId: string;
    className?: string;
    showChange?: boolean;
    prefix?: string;
    decimals?: number;
}

/**
 * LivePrice component displays real-time price with flash animation
 * when price changes (green for up, red for down)
 */
const LivePrice: React.FC<LivePriceProps> = ({
    coinId,
    className = '',
    showChange = false,
    prefix = '$',
    decimals = 2,
}) => {
    const { prices, isLive } = usePriceStore();
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const [prevPrice, setPrevPrice] = useState<number | null>(null);

    const currentData = prices[coinId];

    const currentPrice = currentData?.usd ?? 0;
    const change24h = currentData?.usd_24h_change ?? 0;

    // Detect price change and trigger flash
    if (prevPrice !== null && currentPrice !== prevPrice) {
        const direction = currentPrice > prevPrice ? 'up' : 'down';
        setFlash(direction);
        setPrevPrice(currentPrice);
    }
    // Initialize state on first valid price
    if (prevPrice === null && currentPrice > 0) {
        setPrevPrice(currentPrice);
    }

    // Effect for clearing flash
    useEffect(() => {
        if (flash) {
            const timer = setTimeout(() => setFlash(null), 500);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const formattedPrice = currentPrice.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    const flashClass = flash === 'up'
        ? 'animate-flash-green'
        : flash === 'down'
            ? 'animate-flash-red'
            : '';

    return (
        <span className={`inline-flex items-center gap-1 ${className} ${flashClass}`}>
            <span className={change24h >= 0 ? 'text-buy' : 'text-sell'}>
                {prefix}{formattedPrice}
            </span>
            {isLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" title="Live" />
            )}
            {showChange && (
                <span className={`text-xs ${change24h >= 0 ? 'text-buy' : 'text-sell'}`}>
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </span>
            )}
        </span>
    );
};

export default LivePrice;
