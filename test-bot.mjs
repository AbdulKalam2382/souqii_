import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function selectBestCourier(orderDetails) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
  You are an automated logistics AI for Souqii (a Kuwaiti PC parts e-commerce store).
  You need to select the best courier among DHL, FedEx, and Aramex based on the following real order details:
  
  Destination City: ${orderDetails.destinationCity}
  Total Order Value: KD ${orderDetails.orderValue}
  Package Weight: ${orderDetails.packageWeight} kg

  Rules for Courier Selection (CRITICAL For Business Development and Profit Margin Optimization):
  1. Your main goal is to maximize the profit margin for Souqii by selecting the most affordable courier WITHOUT sacrificing the core delivery experience.
  2. For local deliveries (e.g. Kuwait City, Salmiya, Hawalli), Aramex or a local rider is usually the cheapest (Cost ~ KD 2) and still fast enough (1-2 days). Always prefer this to save Souqii money unless item is extremely fragile.
  3. High-value orders (above KD 250) should prioritize safety and insurance (DHL or FedEx). While slightly more expensive, it protects the business from loss.
  4. Balance shipping cost against the Total Order Value. Do NOT pick a KD 10 delivery option for a KD 20 order. Find the most affordable safe option.

  Make an intelligent decision based on these factors to improve organizational profit.
  
  You MUST return exactly this JSON format (no markdown):
  {
    "courier": "Courier Name Here", 
    "estimatedDays": "X days",
    "cost": 3.5,
    "reasoning": "Explain the decision focusing on profit calculation."
  }
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// ===========================
// SCENARIO 1: Cheap local order
// ===========================
console.log("━".repeat(60));
console.log("📦 SCENARIO 1: Small local order");
console.log("   Customer in Salmiya, buying a KD 25 RAM stick (0.5 kg)");
console.log("━".repeat(60));
const result1 = await selectBestCourier({
  destinationCity: "Salmiya",
  orderValue: 25,
  packageWeight: 0.5
});
console.log("🚚 Courier:", result1.courier);
console.log("📅 Delivery:", result1.estimatedDays);
console.log("💰 Shipping Cost:", "KD", result1.cost);
console.log("🧠 AI Reasoning:", result1.reasoning);

// ===========================
// SCENARIO 2: High-value order
// ===========================
console.log("\n" + "━".repeat(60));
console.log("📦 SCENARIO 2: Expensive gaming PC");
console.log("   Customer in Kuwait City, buying KD 800 GPU + CPU (3 kg)");
console.log("━".repeat(60));
const result2 = await selectBestCourier({
  destinationCity: "Kuwait City",
  orderValue: 800,
  packageWeight: 3
});
console.log("🚚 Courier:", result2.courier);
console.log("📅 Delivery:", result2.estimatedDays);
console.log("💰 Shipping Cost:", "KD", result2.cost);
console.log("🧠 AI Reasoning:", result2.reasoning);

// ===========================
// SCENARIO 3: Remote area
// ===========================
console.log("\n" + "━".repeat(60));
console.log("📦 SCENARIO 3: Remote area delivery");
console.log("   Customer in Jahra, buying KD 150 motherboard (1.5 kg)");
console.log("━".repeat(60));
const result3 = await selectBestCourier({
  destinationCity: "Jahra",
  orderValue: 150,
  packageWeight: 1.5
});
console.log("🚚 Courier:", result3.courier);
console.log("📅 Delivery:", result3.estimatedDays);
console.log("💰 Shipping Cost:", "KD", result3.cost);
console.log("🧠 AI Reasoning:", result3.reasoning);

console.log("\n" + "━".repeat(60));
console.log("✅ DISPATCH UNIT DEMO COMPLETE");
console.log("━".repeat(60));
