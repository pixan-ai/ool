export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) return Response.json({ results: [] });

    const key =
      process.env.BRAVE_API_KEY ||
      process.env.BRAVE_SEARCH_API_KEY ||
      process.env.BRAVE_KEY;
    if (!key) return Response.json({ results: [] });

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key,
      },
    });

    if (!res.ok) return Response.json({ results: [] });

    const data = await res.json();
    const results = (data.web?.results || []).slice(0, 5).map(
      (r: { title: string; description?: string; url: string }) => ({
        title: r.title,
        snippet: r.description || "",
        url: r.url,
      })
    );

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
