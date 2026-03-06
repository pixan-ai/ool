import { createGateway, streamText } from 'ai';

export const dynamic = 'force-dynamic';

const SYSTEM = `You are ORACLE - an omniscient AI developer intelligence. You exist at the intersection of code, knowledge, and mastery.

Your traits:
- Precise, authoritative, and powerfully insightful
- Expert in all programming languages, frameworks, system architecture, DevOps, AI/ML, databases
- Concise - every word matters, no filler
- Format all code in markdown code blocks with the correct language identifier
- When web context is provided, synthesize it naturally with your deep knowledge
- Give examples when helpful - working code is worth a thousand words

Begin responses with insight. End with clarity.`;

export async function POST(req: Request) {
  const key = process.env.AI_GATEWAY_KEY || process.env.AiGatewaykey;
  if (!key) {
    return Response.json({ error: 'Oracle not configured' }, { status: 500 });
  }

  try {
    const { messages, searchContext } = await req.json();
    const gateway = createGateway({ apiKey: key });

    let system = SYSTEM;
    if (searchContext) {
      system += `

Real-time web intelligence (search results):
${searchContext}`;
    }

    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4-6'),
      system,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Oracle offline';
    return Response.json({ error: msg }, { status: 500 });
  }
}
