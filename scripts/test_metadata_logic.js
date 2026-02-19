
import { fetchSingleCoinMetadata } from '../src/services/api';

// Mock axios since we can't use the real network in this restricted environment easily without setup, 
// BUT wait, I have network access via `read_url_content` (kind of) or `browser`.
// Actually, `run_command` can run `ts-node`.
// I'll try to use the actual code if possible, but I need to handle imports.
// A standalone script using axios directly is safer to test the Logic.

const axios = require('axios');

async function test() {
    console.log("Testing fetchSingleCoinMetadata for 'peanut-the-squirrel'...");

    // 1. Simulate what fetchSingleCoinMetadata does
    const coinId = 'peanut-the-squirrel';
    const geckoUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`;

    try {
        console.log(`Fetching Gecko: ${geckoUrl}`);
        const geckoRes = await axios.get(geckoUrl);
        const coin = geckoRes.data[0];

        if (!coin) {
            console.error("Coin not found on Gecko");
            return;
        }

        console.log(`Found Coin: ${coin.name} (${coin.symbol})`);

        // 2. Simulate DexScreener Search
        const dexUrl = `https://api.dexscreener.com/latest/dex/search?q=${coin.symbol}`;
        console.log(`Fetching DexScreener: ${dexUrl}`);
        const dexRes = await axios.get(dexUrl);
        const pairs = dexRes.data.pairs;

        if (pairs && pairs.length > 0) {
            pairs.sort((a: any, b: any) => b.volume?.h24 - a.volume?.h24);
            const bestPair = pairs[0];
            console.log("Best Pair Found:");
            console.log("ChainId:", bestPair.chainId);
            console.log("PairAddress:", bestPair.pairAddress);
            console.log("URL:", bestPair.url);
        } else {
            console.error("No pairs found on DexScreener");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
