const axios = require('axios');

async function testInit() {
    try {
        console.log('Testing /api/dev/init...');
        const res = await axios.post('https://bchflux-backend.onrender.com/api/dev/init');
        console.log('Success:', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Response data:', e.response.data);
            console.error('Status:', e.response.status);
        }
    }
}

testInit();
