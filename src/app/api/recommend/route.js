import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { RECOMMEND_PROMPT } from '@/lib/prompts';

export async function GET() {
  try {
    const data = await callClaude(RECOMMEND_PROMPT);
    if (!Array.isArray(data.picks)) throw new Error('Invalid response from AI');
    return NextResponse.json(data);
  } catch (err) {
    const isRate = err.message?.includes('Rate limit') || err.message?.includes('rate');
    return NextResponse.json(
      { error: err.message || 'Recommendation failed' },
      { status: isRate ? 429 : 500 }
    );
  }
}
