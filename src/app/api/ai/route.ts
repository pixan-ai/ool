import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const MODEL = process.env.AI_MODEL || "gemini-2.0-flash";

const SYSTEM = `You are Koan, a zen writing companion embedded in ool, a mindful note editor.
You help writers with clarity, creativity, and beauty.
Keep responses concise, elegant, and thoughtful.
Use markdown formatting when appropriate.
Match the language of the user's text when possible.`;

export async function POST(req: Request) {
  try {
    const { action, content, selection, customPrompt } = await req.json();

    let prompt = "";
    switch (action) {
      case "continue":
        prompt = `Continue writing naturally from where this text leaves off. Match the tone, style, and language. Write 2-3 paragraphs:\n\n${content}`;
        break;
      case "improve":
        prompt = `Improve this text while preserving its voice. Make it clearer, more vivid, and more elegant. Return only the improved text:\n\n${selection || content}`;
        break;
      case "summarize":
        prompt = `Create a concise, beautiful summary of this text. Use the same language as the source:\n\n${content}`;
        break;
      case "brainstorm":
        prompt = `Based on this text, brainstorm 7 creative related ideas. Format as a markdown list with brief descriptions:\n\n${content}`;
        break;
      case "haiku":
        prompt = `Capture the essence of this text in a haiku (5-7-5 syllable format). If the text is not in English, write the haiku in that language:\n\n${content}`;
        break;
      case "translate":
        prompt = `Translate this text to Japanese, maintaining meaning, nuance, and beauty. Add furigana for difficult kanji:\n\n${content}`;
        break;
      case "custom":
        prompt = `Context (the user's note):\n${content}\n\nUser request: ${customPrompt}`;
        break;
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    const result = streamText({
      model: google(MODEL),
      system: SYSTEM,
      prompt,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI service unavailable";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
