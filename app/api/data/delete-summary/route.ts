import { NextResponse } from 'next/server';
import { handleDeleteSummaryPost } from '@/src/lib/server/dataPrivacyHandlers';

export async function POST(request: Request) {
  const { status, body } = await handleDeleteSummaryPost(request);
  return NextResponse.json(body, { status });
}
