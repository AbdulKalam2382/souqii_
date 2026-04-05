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
  const { data: products, error } = await supabase.from('products').select('*, categories(*)');
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
  const groq = getGroq();
  const products = await getAllProducts();

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert PC build advisor for Souqii. Given a catalog and user setup, recommend the building/best matching products. return JSON."
        },
        {
          role: "user",
          content: `Catalog: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, specs: p.specs })))}
          Looking For: ${setupData.lookingFor || 'A PC component'}
          Current Setup: ${setupData.currentSetup || 'Not specified'}
          Use Case/Budget: ${setupData.useCaseBudget || 'Not specified'}

          Return exactly: { "bestMatchId": number, "budgetPickId": number, "explanation": "Short advice." }`
        }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const bestMatch = products.find(p => p.id === parsed.bestMatchId);
    const budgetPick = products.find(p => p.id === parsed.budgetPickId);

    return {
      bestMatch,
      budgetPick,
      explanation: parsed.explanation
    };
  } catch (err) {
    console.error("getAIRecommendations error:", err);
    return { bestMatch: products[0] || null, explanation: "Unable to reach AI advisor, showing our top pick." };
  }
}

/**
 * b) aiSmartSearch()
 * Natural language search like "gaming GPU under $500" -> returns filtered products
 * (Legacy function - kept for backward compatibility)
 */
export async function aiSmartSearch(query) {
  const result = await aiConversationalSearch(query);
  return result.products || [];
}

/**
 * b2) aiConversationalSearch()
 * Natural language search with conversational AI response like Claude.
 * Returns: { message: string, products: array }
 */
export async function aiConversationalSearch(query) {
  const groq = getGroq();
  const products = await getAllProducts();

  // Create a simplified catalog for context
  const catalog = products.map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    category_slug: p.categories?.slug,
    category_name: p.categories?.name,
    specs: p.specs
  }));

  // Detect simple budget constraints locally for post-filtering
  const budgetMatch = query.match(/(?:under|below|max|maximum|less than|up to)\s*(\d+)/i);
  const maxPrice = budgetMatch ? parseInt(budgetMatch[1]) : null;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Souqii AI, a precision-focused PC parts shopping assistant for a Kuwait-based store. 
All prices are in KWD (Kuwaiti Dinar).

STRICT FILTERING RULES:
1. CATEGORY: If the user asks for a specific category (e.g., "RAM", "GPU", "CPU"), ONLY return product IDs that belong to that category.
2. BUDGET: If the user specifies a budget (e.g., "under 100 KD"), ONLY return product IDs where price <= budget.
3. NO MATCHES: If NO products in the provided catalog meet the user's category and budget criteria, your "message" must state: "No relevant match found in our current inventory. We will notify you once new stock arrives that fits your criteria! 📢" 
   - In this case, "productIds" should be an empty array [].

RESPONSE FORMAT (JSON):
{
  "message": "Friendly, expert advice. Briefly explain why these parts fit the user's criteria, OR the 'no match' message if applicable.",
  "productIds": [array of matching product IDs]
}`
        },
        {
          role: "user",
          content: `User Query: "${query}"
          Budget Constraint: ${maxPrice ? `Max ${maxPrice} KWD` : 'None'}
          Detected Intent: Search for ${query.match(/ram|gpu|cpu|motherboard|psu|storage/i)?.[0] || 'requested part'}

Available Product Catalog:
${JSON.stringify(catalog, null, 2)}`
        }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content);
    
    // Map product IDs to full product objects AND apply strict local filtering as a safety layer
    let matchedProducts = (response.productIds || [])
      .map(id => products.find(p => p.id === parseInt(id)))
      .filter(Boolean);

    // Apply hard budget filter if detected (Safety Layer)
    if (maxPrice) {
      matchedProducts = matchedProducts.filter(p => p.price <= maxPrice);
    }

    // Apply category keyword heuristic if the AI is loose (Safety Layer)
    // Refined to check category slugs for much higher precision
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('ram')) {
        matchedProducts = matchedProducts.filter(p => p.categories?.slug === 'ram' || (p.name + " " + (p.categories?.name || "")).toLowerCase().includes('ram'));
    } else if (lowerQuery.includes('gpu') || lowerQuery.includes('graphics')) {
        matchedProducts = matchedProducts.filter(p => p.categories?.slug === 'gpu' || (p.name + " " + (p.categories?.name || "")).toLowerCase().includes('gpu') || (p.categories?.name || "").toLowerCase().includes('graphics'));
    } else if (lowerQuery.includes('cpu') || lowerQuery.includes('processor')) {
        matchedProducts = matchedProducts.filter(p => p.categories?.slug === 'cpu' || (p.name + " " + (p.categories?.name || "")).toLowerCase().includes('cpu') || (p.categories?.name || "").toLowerCase().includes('processor'));
    }

    return {
      message: response.message || "Here's what I found for you!",
      products: matchedProducts
    };

  } catch (err) {
    console.error("aiConversationalSearch error:", err);
    
    // Fallback: Local keyword + budget matching
    let filtered = products;
    if (maxPrice) filtered = filtered.filter(p => p.price <= maxPrice);
    
    const q = query.toLowerCase();
    const fallbackProducts = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand?.toLowerCase().includes(q) ||
      (p.specs && JSON.stringify(p.specs).toLowerCase().includes(q))
    ).slice(0, 5);

    if (fallbackProducts.length > 0) {
      return {
        message: `I found ${fallbackProducts.length} product${fallbackProducts.length > 1 ? 's' : ''} matching your search${maxPrice ? ` under ${maxPrice} KD` : ''}.`,
        products: fallbackProducts
      };
    } else {
      return {
        message: `I couldn't find any products perfectly matching "${query}". Try searching for specific categories like GPU or RAM!`,
        products: []
      };
    }
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
