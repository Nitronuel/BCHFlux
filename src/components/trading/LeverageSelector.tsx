import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface LeverageSelectorProps {
    currentLeverage: number;
    maxLeverage: number;
    liquidity: number;
    onChange: (leverage: number) => void;
}

const LeverageSelector: React.FC<LeverageSelectorProps> = ({
    currentLeverage,
    maxLeverage,
    liquidity,
    onChange
}) => {
    // Tier definitions for reference (used for warning text logic)
    const tiers = [
        { value: 1.2, label: '1.2x', minLiquidity: 500000 },
        { value: 2, label: '2x', minLiquidity: 1000000 },
        { value: 3, label: '3x', minLiquidity: 5000000 },
    ];

    const formatLiquidity = (val: number) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        return `$${(val / 1000).toFixed(0)}k`;
    };

    return (
        <div className="p-3 bg-background rounded border border-border">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-text-secondary font-medium">Margin Leverage</span>
                <span className={`text-sm font-bold ${currentLeverage >= 2 ? 'text-sell' : 'text-primary'}`}>
                    {currentLeverage.toFixed(1)}x
                </span>
            </div>

            {/* Range Slider */}
            <div className="px-1 py-1">
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={currentLeverage}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val > maxLeverage) {
                            onChange(maxLeverage);
                        } else {
                            onChange(val);
                        }
                    }}
                    className="w-full accent-primary bg-border h-1 rounded appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-1 text-[10px] text-text-disabled font-medium">
                    <span>1x</span>
                    <span>1.5x</span>
                    <span>2x</span>
                    <span>2.5x</span>
                    <span>3x</span>
                </div>
            </div>

            {/* Info / Warnings */}
            <div className="mt-2 text-[10px] text-text-secondary flex items-start gap-1.5 min-h-[32px]">
                {maxLeverage < 3 ? (
                    <>
                        <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                        <span>
                            Capped at <strong>{maxLeverage}x</strong> (Liquidity: {formatLiquidity(liquidity)}). {' '}
                            Higher leverage requires &gt;{formatLiquidity(tiers.find(t => t.value > maxLeverage)?.minLiquidity || 0)}.
                        </span>
                    </>
                ) : (
                    <span className="text-buy flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
                        Deep Liquidity: Max 3x Unlocked
                    </span>
                )}
            </div>
        </div>
    );
};

export default LeverageSelector;
