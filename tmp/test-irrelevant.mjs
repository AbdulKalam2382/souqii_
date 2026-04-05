import { aiConversationalSearch } from './lib/ai.js';

const run = async () => {
    console.log('\n--- TESTING IRRELEVANT QUERY: "iPhone 15 Pro Max" ---');
    const r1 = await aiConversationalSearch('iPhone 15 Pro Max');
    console.log('AI MESSAGE:', r1.message);
    console.log('PRODUCTS FOUND:', r1.products.length);

    console.log('\n--- TESTING IMPOSSIBLE QUERY: "GPU under 5 KD" ---');
    const r2 = await aiConversationalSearch('GPU under 5 KD');
    console.log('AI MESSAGE:', r2.message);
    console.log('PRODUCTS FOUND:', r2.products.length);
};

run().catch(console.error);
