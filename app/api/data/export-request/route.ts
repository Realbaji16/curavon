import { NextResponse } from 'next/server';
import { handleExportRequestPost } from '@/src/lib/server/dataPrivacyHandlers';

export async function POST(request: Request) {
  const { status, body } = await handleExportRequestPost(request);
  return NextResponse.json(body, { status });
}
