
/**
 * Formats a number as a currency string.
 * Handles small numbers (like meme coins) by automatically increasing decimal places.
 */
export const formatPrice = (price: number, currency: string = 'USD'): string => {
    if (price === 0) return '$0.00';
    if (!price) return '$0.00';

    // For very small numbers (e.g. PEPE, SHIB)
    if (price < 0.0001) {
        return `$${price.toFixed(8)}`;
    }
    if (price < 0.01) {
        return `$${price.toFixed(6)}`;
    }
    if (price < 1) {
        return `$${price.toFixed(4)}`;
    }

    // Standard currency formatting for > $1
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
};

/**
 * Formats a large number (Volume, Market Cap) with suffixes (K, M, B, T)
 */
export const formatVolume = (num: number): string => {
    if (num >= 1_000_000_000_000) return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
};
