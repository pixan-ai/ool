export const dynamic = "force-dynamic";

// Adam voice — deep, authoritative developer feel
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return Response.json({ error: "No text provided" }, { status: 400 });

    const key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
    if (!key) return Response.json({ error: "Voice API not configured" }, { status: 500 });

    // Strip markdown symbols before TTS
    const clean = text
      .replace(/```[\s\S]*?```/g, " code snippet. ")
      .replace(/`[^`]+`/g, "code")
      .replace(/[#*_~\[\]()]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 900);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": key,
        },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Voice error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
