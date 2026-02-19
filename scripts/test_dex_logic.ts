
import axios from 'axios';

async function test() {
    console.log("Testing DexScreener logic for 'pnut'...");

    const symbol = 'pnut';
    const dexUrl = `https://api.dexscreener.com/latest/dex/search?q=${symbol}`;

    try {
        console.log(`Fetching: ${dexUrl}`);
        const dexRes = await axios.get(dexUrl);
        const pairs = dexRes.data.pairs;

        if (pairs && pairs.length > 0) {
            // Sort by volume to find the best pair
            pairs.sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

            const bestPair = pairs[0];
            console.log("Best Pair Found:");
            console.log("Symbol:", bestPair.baseToken.symbol);
            console.log("ChainId:", bestPair.chainId);
            console.log("PairAddress:", bestPair.pairAddress);
            console.log("Volume H24:", bestPair.volume?.h24);
        } else {
            console.error("No pairs found on DexScreener for", symbol);
        }

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

test();
