const axios = require('axios');

const BASE_URL = 'http://localhost:3009'; // Port from .env
const ADMIN_EMAIL = 'admin@whatsapp-bridge.com';
const ADMIN_PASSWORD = 'admin123';

async function testConcurrency() {
    console.log('Logging in...');
    try {
        const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        const TOKEN = loginRes.data.token;
        if (!TOKEN) throw new Error('No token received');
        console.log('Login successful. Token acquired.');

        const sessionId = 'sam2';
        const action = 'connect';
        const API_URL = `${BASE_URL}/api/admin/sessions/${sessionId}?action=${action}`;

        console.log(`Starting concurrency test (3 simultaneous requests for ${sessionId})...`);

        // Using simple promises to trigger them as close as possible
        const r1 = axios.post(API_URL, {}, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const r2 = axios.post(API_URL, {}, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const r3 = axios.post(API_URL, {}, { headers: { Authorization: `Bearer ${TOKEN}` } });

        const results = await Promise.allSettled([r1, r2, r3]);

        results.forEach((res, i) => {
            if (res.status === 'fulfilled') {
                console.log(`Request ${i + 1}: Success - ${JSON.stringify(res.value.data)}`);
            } else {
                console.log(`Request ${i + 1}: Failed - ${res.reason.message}`);
                if (res.reason.response) {
                    console.log(`      Status: ${res.reason.response.status}`);
                    console.log(`      Data: ${JSON.stringify(res.reason.response.data)}`);
                }
            }
        });

        // Check status after a short delay
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await axios.get(`${BASE_URL}/api/admin/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('Session Status after 5s:', JSON.stringify(statusRes.data));

    } catch (err) {
        console.error('Test failed overall:', err.message);
        if (err.response) {
            console.error('Response data:', JSON.stringify(err.response.data));
        }
    }
}

testConcurrency();
