import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, path, options = {}) {
    console.log(`\n--- Testing ${name} (${path}) ---`);
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await res.json();
        if (res.ok) {
            console.log(`✅ SUCCESS: ${res.status}`);
            // console.log(JSON.stringify(data, null, 2).substring(0, 200) + '...');
            return data;
        } else {
            console.error(`❌ FAILED: ${res.status}`);
            console.error(data);
            return null;
        }
    } catch (err) {
        console.error(`💥 ERROR: ${err.message}`);
        return null;
    }
}

async function runTests() {
    console.log("🚀 Starting API Verification...");

    // 1. Health Check
    await testEndpoint('Health Check', '/api/test');

    // 2. Products List
    const productsData = await testEndpoint('Products List', '/api/products');
    let productId = 1;
    if (productsData && productsData.products && productsData.products.length > 0) {
        productId = productsData.products[0].id;
        console.log(`Found product ID: ${productId}`);
    }

    // 3. Single Product
    if (productId) {
        await testEndpoint('Single Product', `/api/products?id=${productId}`);
    }

    // 4. AI Search
    await testEndpoint('AI Search', '/api/ai', {
        method: 'POST',
        body: JSON.stringify({
            action: 'search',
            payload: { query: 'laptop' }
        })
    });

    // 5. Auth Signin
    const authData = await testEndpoint('Auth Signin', '/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
            email: 'admin@souqii.com',
            password: 'SouqiiAdmin123!'
        })
    });
    console.log('Auth response:', authData);
    const userId = authData?.user?.id;
    console.log('Using User ID:', userId);

    // 5b. Create User Profile (Pre-requisite for some FKs)
    if (userId) {
        await testEndpoint('Create User Profile', '/api/userDetails', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                name: 'Souqii Admin',
                email: 'admin@souqii.com',
                phone: '+965 1234 5678',
                address: { block: '4', street: '101', house: '12', area: 'Hawally' }
            })
        });
    }

    // 6. Create Order (DEMO MODE)
    console.log('Attempting to create order with Demo Mode (dummy_payment: true, user_id: null)...');
    const orderData = await testEndpoint('Create Order (Demo)', '/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            user_id: null,
            items: [{ product_id: productId, quantity: 1 }],
            door_number: '12',
            street: '101',
            block: '4',
            area: 'Hawally',
            city: 'Kuwait City',
            pincode: '12345',
            dummy_payment: true // NEW DEMO FLAG
        })
    });
    const orderId = orderData?.order_id;
    console.log('Order Status should be "paid":', orderId);

    // 7. Get Order Details
    if (orderId) {
        await testEndpoint('Order Details', `/api/orders?order_id=${orderId}`);
    }

    // 8. Admin AI Briefing
    await testEndpoint('Admin AI Briefing', '/api/admin/ai');

    // 9. Update Order Status (PATCH) - Simulated Worker Dispatch
    if (orderId) {
        await testEndpoint('Update Order Status (PATCH)', '/api/orders', {
            method: 'PATCH',
            body: JSON.stringify({
                order_id: orderId,
                status: 'dispatched'
            })
        });
    }

    // 10. User Details
    if (userId) {
        await testEndpoint('User Details', `/api/userDetails?user_id=${userId}`);
    }

    // 10. User Details
    if (userId) {
        await testEndpoint('User Details', `/api/userDetails?user_id=${userId}`);
    }

    console.log("\n🏁 API Verification Complete!");
}

runTests();
