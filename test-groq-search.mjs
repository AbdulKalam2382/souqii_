import { config } from 'dotenv';
config({ path: '.env.local' });
import { aiSmartSearch } from './lib/ai.js';

async function testGroqSearch() {
  console.log("🧪 Testing Groq Search for 'RAM for i5 13th gen'...");
  try {
    const results = await aiSmartSearch("RAM for i5 13th gen");
    console.log("✅ Results found:", results.length);
    results.forEach(p => console.log(` - ${p.name} (${p.price} KD)`));
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

testGroqSearch();
