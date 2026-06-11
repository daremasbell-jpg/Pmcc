import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude';
import { ANALYZE_PROMPT } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { ticker } = await request.json();

    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
    }

    const t = ticker.trim().toUpperCase().slice(0, 10);
    if (!/^[A-Z]{1,10}$/.test(t)) {
      return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 });
    }

    const data = await callClaude(ANALYZE_PROMPT(t));
    if (!data.ticker) throw new Error('Invalid response from AI');

    return NextResponse.json(data);

  } catch (err) {
    const isRate = err.message?.includes('Rate limit') || err.message?.includes('rate');
    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: isRate ? 429 : 500 }
    );
  }
}
