import { getAIRecommendations, aiSmartSearch, checkCompatibility } from '@/lib/ai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // Backward compatibility: Handle different legacy formats (search actions)
    const searchQuery = payload?.query || body.query || body.message;
    const effectiveAction = action || (body.query || body.message ? 'search' : null);

    let result;

    if (effectiveAction === 'recommend') {
      result = await getAIRecommendations(payload);
    } else if (effectiveAction === 'search') {
      result = await aiSmartSearch(searchQuery);
    } else if (action === 'compatibility') {
      result = await checkCompatibility(payload.part1Id, payload.part2Id);
    } else {
      return NextResponse.json({ error: 'Unknown or missing action' }, { status: 400 });
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
