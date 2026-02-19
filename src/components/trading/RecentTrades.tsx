import React, { useState } from 'react';
import { formatPrice } from '../../utils/format';

interface Trade {
    price: string;
    amount: string;
    time: string;
    side: 'buy' | 'sell';
}

const RecentTrades: React.FC = () => {
    const [trades] = useState<Trade[]>(() => {
        return Array.from({ length: 20 }).map(() => ({
            price: (43250 + (Math.random() - 0.5) * 50).toFixed(2),
            amount: (Math.random() * 0.5).toFixed(4),
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            side: Math.random() > 0.5 ? 'buy' : 'sell'
        }));
    });

    return (
        <div className="flex flex-col h-full bg-surface text-xs overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex justify-between items-center text-text-secondary">
                <span>Price(USDT)</span>
                <span>Amount(BTC)</span>
                <span>Time</span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {trades.map((trade, i) => (
                    <div key={i} className="flex justify-between px-3 py-0.5 hover:bg-hover cursor-pointer">
                        <span className={trade.side === 'buy' ? 'text-buy' : 'text-sell'}>{formatPrice(parseFloat(trade.price))}</span>
                        <span className="text-text-primary">{trade.amount}</span>
                        <span className="text-text-secondary">{trade.time}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentTrades;
