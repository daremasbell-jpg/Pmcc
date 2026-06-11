import { NextResponse } from 'next/server';
import { loadUserData, saveUserData } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET — load positions and settings for a user
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    const data = await loadUserData(userId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — save positions and settings
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, positions, settings } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await saveUserData(userId, { positions: positions || [], settings: settings || {} });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
