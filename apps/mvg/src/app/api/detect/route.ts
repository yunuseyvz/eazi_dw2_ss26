import { NextRequest, NextResponse } from 'next/server';
import { detectAccessibilityNeeds } from '@aufzug/shared/api/detect';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    const result = await detectAccessibilityNeeds(image);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      detected: result.detected,
      types: result.types,
    });
  } catch (err: any) {
    console.error('[detect] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
