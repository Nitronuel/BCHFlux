const axios = require('axios');

const RANGO_API_KEY = 'c6381a79-2817-4602-83bf-6a641a409e32';
const BASE_URL = 'https://api.rango.exchange';

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});

async function findToken() {
    console.log("Searching for PEPE on SOLANA...");
    try {
        const response = await axios.get(`${BASE_URL}/meta/tokens`, {
            headers: { 'x-api-key': RANGO_API_KEY },
            timeout: 10000
        });

        const tokens = response.data.tokens || response.data;
        console.log(`Found ${tokens.length} tokens.`);

        const matches = tokens.filter(t =>
            (t.symbol === 'PEPE' || t.symbol.includes('PEPE')) &&
            t.blockchain === 'SOLANA'
        );

        if (matches.length > 0) {
            console.log("PEPE SOLANA ADDRESS:", matches[0].address);
        } else {
            console.log("No PEPE found on SOLANA.");
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

findToken();
