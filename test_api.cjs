const axios = require('axios');

async function testBackend() {
    try {
        console.log("1. Requesting Quote...");
        const quoteRes = await axios.post('http://localhost:3001/api/bridge/quote', {
            amount: 0.1,
            toToken: 'PEPE',
            toChain: 'SOLANA'
        });
        console.log("Quote Result:");
        console.log(quoteRes.data);

        console.log("\n2. Requesting TX Create...");
        const txRes = await axios.post('http://localhost:3001/api/bridge/tx/create', {
            requestId: quoteRes.data.quoteId,
            userWalletAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
        });
        console.log("TX Result:");
        console.log(txRes.data);
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}
testBackend();
