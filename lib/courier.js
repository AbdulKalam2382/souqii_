import { GoogleGenerativeAI } from '@google/generative-ai';

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Fast JavaScript Dispatch Logic replacing AI to avoid Rate Limits.
 * It compares DHL vs FedEx vs Aramex based on:
 * - Destination city (Kuwait areas)
 * - Order value (high value = prioritize reliability)
 * - Package weight
 * - Delivery speed vs cost
 */
export async function selectBestCourier(orderDetails) {
  const city = (orderDetails.destinationCity || 'Unknown').toLowerCase();
  const value = parseFloat(orderDetails.orderValue) || 0;
  const weight = parseFloat(orderDetails.packageWeight) || 1;

  // Rule 4: Remote areas might cost slightly more or take longer
  const isRemote = city.includes("jahra") || city.includes("ahmadi") || city.includes("wafra");
  
  // Rule 2 & 3: Order value thresholds
  if (value >= 250) {
    // High-value item: Prioritize Safety via DHL/FedEx
    return {
      courier: "DHL / FedEx Express",
      estimatedDays: isRemote ? "2-3 days" : "1-2 days",
      cost: isRemote ? 6.0 : 4.5,
      reasoning: "DHL/FedEx Selected — Maximizes safety and insurance for high-value orders (over KD 250), protecting business from loss."
    };
  } else {
    // Standard item: Prioritize business profit margins via local riders
    return {
      courier: "Aramex (Local Rider)",
      estimatedDays: isRemote ? "2 days" : "1 day",
      cost: isRemote ? 2.5 : 2.0,
      reasoning: "Aramex Selected — Most cost-effective local delivery option. Maximizes Souqii's profit margin on standard value orders."
    };
  }
}
