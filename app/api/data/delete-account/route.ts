import { NextResponse } from 'next/server';
import { handleDeleteAccountPost } from '@/src/lib/server/dataPrivacyHandlers';

export async function POST(request: Request) {
  const { status, body } = await handleDeleteAccountPost(request);
  return NextResponse.json(body, { status });
}
