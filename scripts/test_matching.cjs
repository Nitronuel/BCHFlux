const crypto = require('crypto');

// Mock Data
let idCounter = 1;
const orders = [];
const balances = {
    'user_A': { 'PEPE': 0, 'BCH': 1000 }, // Buyer (Has BCH, wants PEPE)
    'user_B': { 'PEPE': 50000, 'BCH': 0 }  // Seller (Has PEPE, wants BCH)
};

// Helper to create orders
function createOrder(userId, side, type, price, amount) {
    const order = {
        id: idCounter++,
        user_id: userId,
        symbol: 'PEPE/BCH',
        side,
        type,
        price,
        amount,
        filled: 0,
        status: 'open',
        created_at: new Date().toISOString()
    };
    orders.push(order);
    return order;
}

// Mock Balance Process
function processTrade(userId, debitAsset, debitAmount, creditAsset, creditAmount) {
    balances[userId][debitAsset] -= debitAmount;
    balances[userId][creditAsset] += creditAmount;
}

// --- CORE MATCHING LOGIC (Copied from OrdersService) ---
function matchOrdersSync() {
    const bids = orders.filter(o => o.side === 'buy' && ['open', 'partial'].includes(o.status));
    const asks = orders.filter(o => o.side === 'sell' && ['open', 'partial'].includes(o.status));

    bids.sort((a, b) => {
        const priceA = (a.type === 'market' || !a.price) ? Infinity : a.price;
        const priceB = (b.type === 'market' || !b.price) ? Infinity : b.price;
        if (priceA > priceB) return -1;
        if (priceA < priceB) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    asks.sort((a, b) => {
        const priceA = (a.type === 'market' || !a.price) ? 0 : a.price;
        const priceB = (b.type === 'market' || !b.price) ? 0 : b.price;
        if (priceA < priceB) return -1;
        if (priceA > priceB) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let bidIdx = 0;
    let askIdx = 0;

    while (bidIdx < bids.length && askIdx < asks.length) {
        const bid = bids[bidIdx];
        const ask = asks[askIdx];

        const bidPrice = (bid.type === 'market' || !bid.price) ? Infinity : bid.price;
        const askPrice = (ask.type === 'market' || !ask.price) ? 0 : ask.price;

        if (bidPrice < askPrice) break; // Gap exists

        const remainingBid = bid.amount - (bid.filled || 0);
        const remainingAsk = ask.amount - (ask.filled || 0);
        const matchSize = Math.min(remainingBid, remainingAsk);

        let executionPrice = 0;
        if (bid.type === 'market' && ask.type === 'market') {
            executionPrice = 0.0001; // Mock Oracle Price
        } else if (bid.type === 'market') {
            executionPrice = ask.price;
        } else if (ask.type === 'market') {
            executionPrice = bid.price;
        } else {
            const bidTime = new Date(bid.created_at).getTime();
            const askTime = new Date(ask.created_at).getTime();
            executionPrice = (bidTime <= askTime) ? bid.price : ask.price;
        }

        console.log(`\n=> MATCHING: ${matchSize} PEPE @ ${executionPrice} BCH [Bid=${bid.id}, Ask=${ask.id}]`);

        // Settle Buyer (BID)
        // Note: For simulation, we assume they had exactly what they intended locked.
        const buyerQuoteCost = matchSize * executionPrice;
        processTrade(bid.user_id, 'BCH', buyerQuoteCost, 'PEPE', matchSize);
        if (bid.type === 'limit' && executionPrice < bid.price) {
            const surplus = (bid.price - executionPrice) * matchSize;
            // processTrade(bid.user_id, 'BCH', 0, 'BCH', surplus);
            console.log(`   (Buyer saved ${surplus} BCH difference)`);
        }

        // Settle Seller (ASK)
        processTrade(ask.user_id, 'PEPE', matchSize, 'BCH', buyerQuoteCost);

        // Update local
        bid.filled = (bid.filled || 0) + matchSize;
        ask.filled = (ask.filled || 0) + matchSize;
        if (bid.filled >= bid.amount) bid.status = 'filled';
        if (ask.filled >= ask.amount) ask.status = 'filled';

        if (bid.filled >= bid.amount) bidIdx++;
        if (ask.filled >= ask.amount) askIdx++;
    }
}

// --- RUN SCENARIOS ---

console.log("=== STARTING BALANCES ===");
console.log(balances);

// Scenario 1: Partial Fill Maker-Taker
console.log("\n=== SCENARIO 1: Sell 10,000 PEPE @ 0.005 BCH. Buy 5,000 PEPE @ 0.005 BCH ===");
createOrder('user_B', 'sell', 'limit', 0.005, 10000); // Maker Ask
createOrder('user_A', 'buy', 'limit', 0.005, 5000);   // Taker Bid
matchOrdersSync();

console.log("\nBalances After S1:");
console.log(balances);
console.log("\nOrders After S1:", orders.map(o => ({ id: o.id, side: o.side, filled: o.filled, status: o.status })));

// Scenario 2: Better Price Execution (Surplus)
console.log("\n=== SCENARIO 2: Buy Remaining 5,000 PEPE @ 0.008 BCH (Should execute at Maker's 0.005!) ===");
createOrder('user_A', 'buy', 'limit', 0.008, 5000); // Aggressive Bid
matchOrdersSync();

console.log("\nBalances After S2:");
console.log(balances);
console.log("\nOrders After S2:", orders.map(o => ({ id: o.id, side: o.side, filled: o.filled, status: o.status })));
