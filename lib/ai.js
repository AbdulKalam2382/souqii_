import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

// Initialize the Gemini API client
// We instantiate it here but it will rely on the env var being present at runtime.
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Helper: Fetch all products to use as context
async function getAllProducts() {
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return products || [];
} 
/**
 * a) getAIRecommendations()
 * User gives CPU/RAM/budget (or current setup), AI recommends best GPU from our database.
 */
export async function getAIRecommendations(setupData) {
  const genAI = getGenAI();
  const products = await getAllProducts();
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = `
  You are an expert PC build advisor for the Souqii platform.
  
  The user is looking for: ${setupData.lookingFor || 'A PC component'}
  Their current setup: ${setupData.currentSetup || 'Not specified'}
  Their use case and budget: ${setupData.useCaseBudget || 'Not specified'}

  Here is our entire product catalog:
  ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, specs: p.specs, category_id: p.category_id })))}

  Find the "best match" and a "budget pick" from the catalog that fits their needs and is strictly compatible with their current setup.
  You MUST return exactly this JSON structure (do not include markdown formatting):
  {
    "bestMatchId": <product_id_integer>,
    "budgetPickId": <product_id_integer>,
    "explanation": "Give a short explanation of why these were chosen and their compatibility."
  }
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  const bestMatch = products.find(p => p.id === parsed.bestMatchId);
  const budgetPick = products.find(p => p.id === parsed.budgetPickId);

  return {
    bestMatch,
    budgetPick,
    explanation: parsed.explanation
  };
}

/**
 * b) aiSmartSearch()
 * Natural language search like "gaming GPU under $500" -> returns filtered products
 */
export async function aiSmartSearch(query) {
  const genAI = getGenAI();
  const products = await getAllProducts();
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = `
  You are an AI search assistant for a PC parts store.
  User search query: "${query}"

  Here is our product catalog:
  ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, specs: p.specs })))}

  Analyze the user's intent (e.g., budget constraints, specific parts like "gaming GPU", specs).
  Return a JSON array of the product IDs that best match this query.
  Example output format:
  [1, 5, 8]
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const productIds = JSON.parse(responseText);

  if (!Array.isArray(productIds)) {
    return [];
  }

  // Preserve the order of products returned by Gemini
  return productIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean); // removes undefined if AI hallucinated an ID doesn't exist
}

/**
 * c) checkCompatibility()
 * Checks if two parts work together
 */
export async function checkCompatibility(part1Id, part2Id) {
  const genAI = getGenAI();
  const products = await getAllProducts();
  
  const part1 = products.find(p => p.id === parseInt(part1Id));
  const part2 = products.find(p => p.id === parseInt(part2Id));

  if (!part1 || !part2) {
    return { compatible: false, notes: "One or both parts could not be found in the database." };
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = `
  You are a PC building compatibility checker. 
  Check if these two PC parts are compatible with each other.
  
  Part 1: ${JSON.stringify({ name: part1.name, specs: part1.specs })}
  Part 2: ${JSON.stringify({ name: part2.name, specs: part2.specs })}

  Consider socket types, chipset compatibility, RAM generations (DDR4 vs DDR5), PCIe generations, and form factor.
  You MUST return exactly this JSON structure (no markdown):
  {
    "compatible": true, // or false
    "notes": "A brief explanation of why they are compatible or not."
  }
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return JSON.parse(responseText);
}
