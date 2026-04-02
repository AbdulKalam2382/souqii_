import fetch from 'node-fetch';

async function testPaymentFlow() {
  const baseUrl = "https://souqii-one.vercel.app";

  console.log("Step 1: Creating a test order...");
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "e35b91bd-fd9c-4739-8985-fd257bfe704a", // Using your confirmed test user ID
      items: [{ product_id: 1, quantity: 1 }],
      shipping_address: "123 AI Street",
      shipping_city: "Kuwait City"
    })
  });

  const orderData = await orderRes.json();
  if (!orderData.success) {
    console.error("Order creation failed:", orderData);
    return;
  }

  const orderId = orderData.order_id;
  console.log(`✅ Order created! ID: #${orderId}`);
  console.log(`Current Status: pending_payment`);

  console.log("\nStep 2: Generating Stripe Checkout Link...");
  const checkoutRes = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      return_url: "https://souqii-one.vercel.app"
    })
  });

  const checkoutData = await checkoutRes.json();
  if (!checkoutData.success) {
    console.error("Checkout failed:", checkoutData);
    return;
  }

  console.log(`\n🚀 CHECKOUT READY!`);
  console.log(`Open this link in your browser to pay:`);
  console.log(checkoutData.checkoutUrl);
  console.log(`\nUsed Stripe Test Card: 4242 4242 4242 4242`);
}

testPaymentFlow();
