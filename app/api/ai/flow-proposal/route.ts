import { NextResponse } from 'next/server';
import { handleAIFlowProposalPost } from '@/src/lib/server/aiFlowProposalHandler';

export async function POST(request: Request) {
  const { status, body } = await handleAIFlowProposalPost(request);
  return NextResponse.json(body, { status });
}
