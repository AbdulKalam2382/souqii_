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

  Rules for Courier Selection:
  1. Kuwait City / Local deliveries are usually cheaper and handled well by Aramex (Cost ~ KD 2 to 3, 1-2 days).
  2. High-value orders (above KD 200) should prioritize safety and reliability (DHL or FedEx are preferred).
  3. Heavy packages should balance cost vs speed based on the destination.
  4. International or GCC deliveries usually require DHL or FedEx.

  Make an intelligent decision based on these factors.
  
  You MUST return exactly this JSON format (no markdown):
  {
    "courier": "Courier Name Here (e.g. DHL)", 
    "estimatedDays": "X days",
    "cost": 3.5, // Return a float number representing KD
    "reasoning": "Combine them into a short string like: 'DHL — 1 day — KD 3.5 — best for high-value items to this address'"
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
