const axios = require('axios');

const RANGO_API_KEY = 'c6381a79-2817-4602-83bf-6a641a409e32';
const BASE_URL = 'https://api.rango.exchange';

async function testBridge() {
    console.log("1. Requesting Quote (BCH -> BSC.BNB)...");
    try {
        const quoteReq = {
            from: { blockchain: 'BCH', symbol: 'BCH', address: null },
            to: { blockchain: 'ETH', symbol: 'ETH', address: null },
            amount: '1.0',
            slippage: 3.0,
            checkPrerequisites: false,
            selectedWallets: {
                BCH: 'qqtnmek6jddmh4f3gtzxzsgy2flxs5syhuw8062hft',
                ETH: '0x1234567890123456789012345678901234567890'
            },
            connectedWallets: [
                { blockchain: 'BCH', addresses: ['qqtnmek6jddmh4f3gtzxzsgy2flxs5syhuw8062hft'] },
                { blockchain: 'ETH', addresses: ['0x1234567890123456789012345678901234567890'] }
            ]
        };

        const quoteRes = await axios.post(`${BASE_URL}/routing/best`, quoteReq, {
            headers: { 'x-api-key': RANGO_API_KEY }
        });

        if (!quoteRes.data.result) {
            console.error("Quote failed. Response:", JSON.stringify(quoteRes.data, null, 2));
            return;
        }

        const requestId = quoteRes.data.requestId;
        console.log(`Quote Success! Request ID: ${requestId}`);
        console.log(`Expected Output: ${quoteRes.data.result.outputAmount} BNB`);

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

testBridge();
