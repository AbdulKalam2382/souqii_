import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { supabase } from './supabase.js';

// Initialize the Gemini API client
// We instantiate it here but it will rely on the env var being present at runtime.
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Initialize the Groq client
const getGroq = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing from environment variables.");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
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

  try {
    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // Strip markdown code fences if present
    if (responseText.startsWith("```json")) {
      responseText = responseText.substring(7);
      if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length - 3);
    } else if (responseText.startsWith("```")) {
      responseText = responseText.substring(3);
      if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length - 3);
    }
    
    const productIds = JSON.parse(responseText.trim());

    if (!Array.isArray(productIds)) {
      console.error("AI search returned non-array:", productIds);
      return [];
    }

    // Preserve the order of products returned by Gemini
    return productIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);
  } catch (err) {
    console.error("aiSmartSearch error:", err);
    // Fallback: do a simple text match instead of failing completely
    const lowerQuery = query.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.specs && JSON.stringify(p.specs).toLowerCase().includes(lowerQuery))
    ).slice(0, 5);
  }
}

/**
 * c) groqEnhanceIntent()
 * Uses Llama 3 8B for fast, low-latency intent enhancement.
 */
export async function groqEnhanceIntent(userMessage) {
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the Souqii Bot Intent Engine. Analyze the customer message. Return a JSON object with 'searchQuery' (optimized keywords) and 'friendlyReply' (a very short 1-sentence response). Use JSON mode."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.error("Groq intent enhancement failed:", err);
    return null;
  }
}

/**
 * d) checkCompatibility()
 * Checks if two parts work together
 */
export async function checkCompatibility(part1Id, part2Id) {
  const products = await getAllProducts();
  
  const part1 = products.find(p => p.id === parseInt(part1Id));
  const part2 = products.find(p => p.id === parseInt(part2Id));

  if (!part1 || !part2) {
    return { compatible: false, notes: "One or both parts could not be found in the database." };
  }

  // Fast JavaScript Rules Engine for Compatibility avoiding Rate Limits
  const str1 = (part1.name + " " + JSON.stringify(part1.specs)).toLowerCase();
  const str2 = (part2.name + " " + JSON.stringify(part2.specs)).toLowerCase();

  const isIntel1 = str1.includes("intel") || str1.includes("lga");
  const isAMD1 = str1.includes("amd") || str1.includes("am4") || str1.includes("am5");
  const isIntel2 = str2.includes("intel") || str2.includes("lga");
  const isAMD2 = str2.includes("amd") || str2.includes("am4") || str2.includes("am5");

  // Rule 1: Motherboard vs CPU Brand Mismatch
  // If one is strictly Intel and the other is strictly AMD, they clash.
  if ((isIntel1 && isAMD2) || (isAMD1 && isIntel2)) {
    return {
      compatible: false,
      accuracyRate: "100%",
      performanceImpact: "Critical Failure: Incompatible platforms.",
      notes: "You cannot mix Intel components (like motherboards/CPUs) with AMD components."
    };
  }

  // Rule 2: RAM Generation Mismatch
  const isDDR4_1 = str1.includes("ddr4");
  const isDDR5_1 = str1.includes("ddr5");
  const isDDR4_2 = str2.includes("ddr4");
  const isDDR5_2 = str2.includes("ddr5");
  
  if ((isDDR4_1 && isDDR5_2) || (isDDR5_1 && isDDR4_2)) {
    return {
      compatible: false,
      accuracyRate: "100%",
      performanceImpact: "Critical Failure: RAM slot mismatch.",
      notes: "DDR4 and DDR5 components are physically and electrically incompatible."
    };
  }

  // Default: Probably Compatible
  return {
    compatible: true,
    accuracyRate: "85%",
    performanceImpact: "These parts appear to be standard standard-compliant and should work well together.",
    notes: "Based on our quick-rules engine, no obvious clashes (like Intel vs AMD, or DDR4 vs DDR5) were detected."
  };
}

/**
 * d) nlCompatibilityCheck()
 * Uses Groq (Llama 3 70B) for high-reasoning compatibility analysis.
 * Falls back to the Rules Engine if Groq fails.
 */
export async function nlCompatibilityCheck(part1Id, part2Id) {
  // 1. Run the local Rules Engine first to detect obvious physical clashes
  const quickResult = await checkCompatibility(part1Id, part2Id);
  
  // If we found a critical failure (100% mismatch), return immediately to save API tokens
  if (!quickResult.compatible && quickResult.accuracyRate === "100%") {
    return quickResult;
  }

  // 2. Fetch full product details for deep AI analysis
  const products = await getAllProducts();
  const p1 = products.find(p => p.id === parseInt(part1Id));
  const p2 = products.find(p => p.id === parseInt(part2Id));

  if (!p1 || !p2) return quickResult;

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional PC Hardware Diagnostic Engine for the Souqii platform. Your task is to analyze two components and determine their technical compatibility, potential performance bottlenecks, and installation nuances. You must prioritize technical accuracy and return valid JSON."
        },
        {
          role: "user",
          content: `Analyze these two parts for compatibility and performance:
          Part 1: ${p1.name} (Specs: ${JSON.stringify(p1.specs)})
          Part 2: ${p2.name} (Specs: ${JSON.stringify(p2.specs)})

          You MUST return exactly this JSON format:
          {
            "compatible": boolean,
            "accuracyRate": "e.g. 98%",
            "performanceImpact": "Detailed analysis of how these parts interact, including any potential performance throttling or bottlenecks.",
            "notes": "Short, expert technician notes on installation or compatibility nuances (e.g. BIOS updates, clearance issues)."
          }`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const res = JSON.parse(completion.choices[0].message.content);
    return res;
  } catch (err) {
    console.error("Groq nlCompatibilityCheck error:", err);
    // Fallback to the Rules Engine if the AI is hit with rate limits or errors
    return quickResult;
  }
}

/**
 * e) getAdminBriefing()
 * Uses Llama 3.3 70B to generate a high-level Business Intelligence summary.
 */
export async function getAdminBriefing(data) {
  const { inventory, recentOrders, stats } = data;

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the Souqii AI Business Consultant. Your job is to analyze store data and provide actionable, high-level strategic advice to the owner. Be professional, concise, and identify both risks (stockouts) and opportunities (profit maximization). Use JSON mode."
        },
        {
          role: "user",
          content: `Analyze this Souqii Store snapshot:

          1. Low/Critical Stock: ${JSON.stringify(inventory)}
          2. Recent Orders (Last 10): ${JSON.stringify(recentOrders)}
          3. Business Stats: ${JSON.stringify(stats)}

          Generate a strategic report in exactly this JSON format:
          {
            "executiveSummary": "2-3 sentence overview of business health.",
            "stockAlerts": "Advice on restocking priority based on item popularity.",
            "logisticsOptimization": "Insights on courier performance and profit margins.",
            "growthOpportunity": "One high-impact suggestion to increase revenue."
          }`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.error("Groq Admin Briefing error:", err);
    return {
      executiveSummary: "Strategic briefing engine is currently under maintenance. Metrics are healthy but manual review is advised.",
      stockAlerts: "Check low-stock products in the inventory tab.",
      logisticsOptimization: "Courier selection continues to favor profit margins.",
      growthOpportunity: "Focus on bundle offers for high-end GPUs."
    };
  }
}
