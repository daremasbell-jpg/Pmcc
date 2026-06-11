import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { POSITION_CHECK_PROMPT } from '@/lib/prompts';

export async function POST(request) {
  try {
    const pos = await request.json();

    if (!pos?.ticker) {
      return NextResponse.json({ error: 'position data required' }, { status: 400 });
    }

    const data = await callClaude(POSITION_CHECK_PROMPT(pos));
    return NextResponse.json(data);

  } catch (err) {
    const isRate = err.message?.includes('Rate limit') || err.message?.includes('rate');
    return NextResponse.json(
      { error: err.message || 'Position check failed' },
      { status: isRate ? 429 : 500 }
    );
  }
}
