import { createGateway, streamText } from "ai";

export const dynamic = "force-dynamic";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_KEY || process.env.AiGatewaykey,
});

const AI_MODELS = [
  { id: "google/gemini-flash-3.0", label: "Gemini Flash 3.0", provider: "Google" },
  { id: "google/gemini-pro-2.5", label: "Gemini Pro 2.5", provider: "Google" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", provider: "OpenAI" },
  { id: "meta/llama-4-scout", label: "Llama 4 Scout", provider: "Meta" },
];

const DEFAULT_MODEL = "google/gemini-flash-3.0";

const SYSTEM = `You are Koan, an AI writing assistant inside ool, a note editor.
You help users with their notes — answering questions, writing, editing, brainstorming, translating, or anything they ask.
Keep responses concise and useful. Use markdown formatting when appropriate.
Match the language of the user's text.`;

export async function GET() {
  return Response.json({ models: AI_MODELS, default: DEFAULT_MODEL });
}

export async function POST(req: Request) {
  try {
    const key = process.env.AI_GATEWAY_KEY || process.env.AiGatewaykey;
    if (!key) {
      return Response.json({ error: "AI Gateway key not configured" }, { status: 500 });
    }

    const { content, selection, prompt, model } = await req.json();

    if (!prompt) {
      return Response.json({ error: "No prompt provided" }, { status: 400 });
    }

    const modelId = model || DEFAULT_MODEL;

    const context = selection
      ? `The user's note:\n${content}\n\nSelected text:\n${selection}`
      : content ? `The user's note:\n${content}` : "";

    const fullPrompt = context ? `${context}\n\nUser request: ${prompt}` : prompt;

    const result = streamText({
      model: gateway(modelId),
      system: SYSTEM,
      prompt: fullPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error("AI API error:", error);
    const message = error instanceof Error ? error.message : "AI service unavailable";
    return Response.json({ error: message }, { status: 500 });
  }
}
