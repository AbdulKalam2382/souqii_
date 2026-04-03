import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log("Bot token present:", !!token);

// Step 1: Check current webhook
console.log("\n=== Checking current webhook ===");
const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const info = await infoRes.json();
console.log("Current webhook URL:", info.result?.url || "NOT SET");
console.log("Last error:", info.result?.last_error_message || "none");
console.log("Pending updates:", info.result?.pending_update_count);

// Step 2: Set the webhook to your Vercel URL
console.log("\n=== Setting webhook ===");
const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: "https://souqii-one.vercel.app/api/telegram"
  })
});
const setData = await setRes.json();
console.log("Set webhook result:", JSON.stringify(setData, null, 2));

// Step 3: Verify
console.log("\n=== Verifying ===");
const verifyRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const verifyData = await verifyRes.json();
console.log("Webhook URL now:", verifyData.result?.url);
console.log("Done!");
