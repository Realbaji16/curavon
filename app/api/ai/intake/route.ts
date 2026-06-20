import { NextResponse } from 'next/server';
import { handleAIIntakePost } from '@/src/lib/server/aiIntakeHandler';

export async function POST(request: Request) {
  const { status, body } = await handleAIIntakePost(request);
  return NextResponse.json(body, { status });
}
