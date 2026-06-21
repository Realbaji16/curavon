import { NextResponse } from 'next/server';
import { handleDeletionRequestPost } from '@/src/lib/server/dataPrivacyHandlers';

export async function POST(request: Request) {
  const { status, body } = await handleDeletionRequestPost(request);
  return NextResponse.json(body, { status });
}
