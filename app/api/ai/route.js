import { getAIRecommendations, aiSmartSearch, aiConversationalSearch, checkCompatibility } from '@/lib/ai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // Backward compatibility & Hardening: Handle diverse legacy formats
    const searchQuery = payload?.query || body.query || body.message || body.payload?.message;
    const effectiveAction = action || (searchQuery ? 'search' : null);
    
    // Check if client wants conversational response (new behavior)
    const conversational = payload?.conversational || body.conversational || false;

    let result;

    if (effectiveAction === 'recommend') {
      result = await getAIRecommendations(payload || body);
    } else if (effectiveAction === 'search') {
      // Use conversational search for new clients, legacy for old
      if (conversational) {
        result = await aiConversationalSearch(searchQuery);
      } else {
        result = await aiSmartSearch(searchQuery);
      }
    } else if (effectiveAction === 'compatibility' || action === 'compatibility') {
      result = await checkCompatibility(payload?.part1Id || body.part1Id, payload?.part2Id || body.part2Id);
    } else {
      // Final Fallback: If there's any text, just treat it as search
      if (searchQuery) {
        if (conversational) {
          result = await aiConversationalSearch(searchQuery);
        } else {
          result = await aiSmartSearch(searchQuery);
        }
      } else {
        return NextResponse.json({ error: 'Unknown or missing action' }, { status: 400 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: 'Server Error', details: error.message },
      { status: 500 }
    );
  }
}
