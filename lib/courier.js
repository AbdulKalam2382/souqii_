import { GoogleGenerativeAI } from '@google/generative-ai';

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * AI automatically selects the best courier for each order.
 * It compares DHL vs FedEx vs Aramex based on:
 * - Destination city (Kuwait City vs international)
 * - Order value (high value = prioritize reliability)
 * - Package weight
 * - Delivery speed vs cost
 */
export async function selectBestCourier(orderDetails) {
  /*
   Example orderDetails input:
   {
     destinationCity: "Kuwait City",
     orderValue: 450, // in KD
     packageWeight: 2.5 // in kg
   }
  */
  
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
  You are an automated logistics AI for Souqii (a Kuwaiti PC parts e-commerce store).
  You need to select the best courier among DHL, FedEx, and Aramex based on the following real order details:
  
  Destination City: ${orderDetails.destinationCity || 'Unknown'}
  Total Order Value: KD ${orderDetails.orderValue || 0}
  Package Weight: ${orderDetails.packageWeight || 1} kg

  Rules for Courier Selection (CRITICAL For Business Development and Profit Margin Optimization):
  1. Your main goal is to maximize the profit margin for Souqii by selecting the most affordable courier WITHOUT sacrificing the core delivery experience.
  2. For local deliveries (e.g. Kuwait City, Salmiya, Hawalli), Aramex or a local rider is usually the cheapest (Cost ~ KD 2) and still fast enough (1-2 days). Always prefer this to save Souqii money unless item is extremely fragile.
  3. High-value orders (above KD 250) should prioritize safety and insurance (DHL or FedEx). While slightly more expensive, it protects the business from loss.
  4. Balance shipping cost against the Total Order Value. Do NOT pick a KD 10 delivery option for a KD 20 order. Find the most affordable safe option.

  Make an intelligent decision based on these factors to improve organizational profit.
  
  You MUST return exactly this JSON format (no markdown):
  {
    "courier": "Courier Name Here (e.g. DHL)", 
    "estimatedDays": "X days",
    "cost": 3.5, // Return a float number representing KD. Keep it realistic based on the courier.
    "reasoning": "Explain the decision focusing on profit calculation. e.g.: 'Aramex — 1 day — KD 2.0 — Maximizes Souqii's profit margin for a local delivery while ensuring 1-day delivery time.'"
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Courier AI selection error:", error);
    // Fallback logic just in case AI fails
    return {
      courier: "Aramex",
      estimatedDays: "2 days",
      cost: 2.5,
      reasoning: "Aramex — 2 days — KD 2.5 — Default fallback courier selected."
    };
  }
}
