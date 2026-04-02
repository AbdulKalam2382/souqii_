import { getAIRecommendations, aiSmartSearch, checkCompatibility } from '@/lib/ai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    let result;

    if (action === 'recommend') {
      result = await getAIRecommendations(payload);
    } else if (action === 'search') {
      result = await aiSmartSearch(payload.query);
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
