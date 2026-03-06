export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const apiKey =
      process.env.BRAVE_API_KEY ||
      process.env.BRAVE_SEARCH_API_KEY ||
      process.env.BRAVE_KEY ||
      process.env.BRAVESEARCH_API_KEY;

    if (!apiKey) return Response.json({ results: [] });

    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=en`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!res.ok) return Response.json({ results: [] });

    const data = await res.json();
    const results = (data.web?.results || [])
      .slice(0, 5)
      .map((r: Record<string, string>) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
      }));

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
