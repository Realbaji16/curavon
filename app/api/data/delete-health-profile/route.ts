import { NextResponse } from 'next/server';
import { handleDeleteHealthProfilePost } from '@/src/lib/server/dataPrivacyHandlers';

export async function POST(request: Request) {
  const { status, body } = await handleDeleteHealthProfilePost(request);
  return NextResponse.json(body, { status });
}
