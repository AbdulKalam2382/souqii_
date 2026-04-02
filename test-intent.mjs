import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

config({ path: '.env.local' });

async function listMods() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
     const req = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
     const data = await req.json();
     console.log(data.models.map(m => m.name));
  } catch(e) {
     console.error(e);
  }
}

listMods();
