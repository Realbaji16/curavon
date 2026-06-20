import { NextResponse } from 'next/server';
import { buildHealthApiResponse } from '@/src/lib/server/apiHealth';

export function GET() {
  return NextResponse.json(buildHealthApiResponse());
}
