import { NextResponse } from 'next/server';
import { handleAISummaryPost } from '@/src/lib/server/aiSummaryHandler';

export async function POST(request: Request) {
  const { status, body } = await handleAISummaryPost(request);
  return NextResponse.json(body, { status });
}
