import 'dotenv/config'; // Requires regular dotenv in node_modules, but for Next.js it might be different
// Actually, let's just manually set them or use a separate file.

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { aiConversationalSearch } from './lib/ai.js';

// Manually verify environment
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) process.env[key.trim()] = value.trim();
});

async function runTest() {
  const queries = [
    "ram under 100 kd",
    "suggest me a gaming gpu",
    "i want an intel cpu"
  ];

  for (const q of queries) {
    console.log(`\n--- TESTING QUERY: "${q}" ---`);
    try {
      const result = await aiConversationalSearch(q);
      console.log("MESSAGE:", result.message);
      console.log("PRODUCTS FOUND:", result.products.length);
      result.products.forEach(p => {
        console.log(` - [${p.id}] ${p.name} (KD ${p.price}) [${p.categories?.name}]`);
      });
    } catch (err) {
      console.error("Test failed for query:", q, err);
    }
  }
}

runTest();
