export const dynamic = 'force-dynamic';

// Adam voice - powerful, clear, authoritative
const VOICE_ID = 'F3ex3YYNcqE13sRyHMRP';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const apiKey =
      process.env.ELEVENLABS_API_KEY ||
      process.env.ELEVEN_LABS_API_KEY ||
      process.env.ELEVENLABS_KEY;

    if (!apiKey) {
      return Response.json({ error: 'Voice not configured' }, { status: 503 });
    }

    // Strip markdown for clean TTS, limit length
    const clean = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/[#*`_~>]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 600);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: clean,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.45, similarity_boost: 0.8 },
        }),
      }
    );

    if (!res.ok) {
      return Response.json({ error: 'Voice synthesis failed' }, { status: 500 });
    }

    return new Response(res.body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch {
    return Response.json({ error: 'Voice error' }, { status: 500 });
  }
}
