import { NextResponse } from 'next/server';
import { handleDeleteFlowPost } from '@/src/lib/server/dataPrivacyHandlers';

export async function POST(request: Request) {
  const { status, body } = await handleDeleteFlowPost(request);
  return NextResponse.json(body, { status });
}
