import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.CARTESIA_API_KEY;
  const agentId = process.env.CARTESIA_AGENT_ID;
  const version = process.env.CARTESIA_VERSION ?? '2025-04-16';

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
  }

  return NextResponse.json({ token: apiKey, agentId, version });
}
