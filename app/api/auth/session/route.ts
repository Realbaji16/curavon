import { NextResponse } from 'next/server';
import { buildSessionApiResponse } from '@/src/lib/server/apiSession';

export async function GET() {
  const session = await buildSessionApiResponse();
  return NextResponse.json(session);
}
