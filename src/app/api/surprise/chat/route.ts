import { createGateway, streamText } from "ai";

export const dynamic = "force-dynamic";

const gateway = createGateway({
  apiKey:
    process.env.AI_GATEWAY_KEY ||
    process.env.AiGatewaykey ||
    process.env.AI_GATEWAY_API_KEY ||
    "",
});

const SYSTEM_BASE = `You are ORACLE -- an omniscient AI developer intelligence. You speak with precision and authority. You help developers solve complex problems, understand architectures, debug code, and build powerful software.

Rules:
- Always use markdown code blocks with the language specified (e.g. \`\`\`typescript)
- Keep responses focused, impactful, and actionable
- For code questions, provide working examples, not just descriptions
- For architecture questions, explain trade-offs clearly
- You are concise but never incomplete`;

export async function POST(req: Request) {
  try {
    const { messages, useSearch } = await req.json();

    let systemPrompt = SYSTEM_BASE;

    if (useSearch && messages?.length > 0) {
      const lastMsg = messages[messages.length - 1]?.content || "";
      try {
        const base = new URL(req.url);
        base.pathname = "/api/surprise/search";
        const searchRes = await fetch(base.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: lastMsg }),
        });
        if (searchRes.ok) {
          const { results } = await searchRes.json();
          if (results?.length > 0) {
            const ctx = results
              .map((r: { title: string; snippet: string }) => `- ${r.title}: ${r.snippet}`)
              .join("\n");
            systemPrompt += `\n\n[Live web search results]\n${ctx}`;
          }
        }
      } catch {
        // Search optional — fail silently
      }
    }

    const result = streamText({
      model: gateway("anthropic/claude-sonnet-4-6"),
      system: systemPrompt,
      messages,
      maxTokens: 2048,
    });

    // Plain text stream — no AI SDK client hooks required
    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "ORACLE is temporarily unavailable";
    return Response.json({ error: message }, { status: 500 });
  }
}
