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
    const { messages, searchContext, useSearch, query } = await req.json();

    // If search is requested and we have a query, fetch Brave results
    let context = searchContext || '';
    if (!context && useSearch && query) {
      try {
        const searchRes = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=en`,
          {
            headers: {
              Accept: 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_KEY || '',
            },
          }
        );
        if (searchRes.ok) {
          const data = await searchRes.json();
          const results = (data.web?.results || []).slice(0, 5);
          context = results.map((r: { title: string; url: string; description?: string }) =>
            `[${r.title}](${r.url}): ${r.description || ''}`
          ).join('\n');
        }
      } catch {
        // Search is optional
      }
    }

    const gateway = createGateway({ apiKey: key });

    let system = SYSTEM;
    if (context) {
      system += `\n\nReal-time web intelligence:\n${context}`;
    }

    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4-5'),
      system,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Oracle offline';
    return Response.json({ error: msg }, { status: 500 });
  }
}
