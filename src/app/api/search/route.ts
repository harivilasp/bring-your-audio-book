import { NextResponse } from "next/server";

type SearchBook = {
  id: number;
  title: string;
  author: string;
  description: string;
  category: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.FREELLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Search service is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as { query?: string; books?: SearchBook[] };
  const query = body.query?.trim();
  const books = body.books?.slice(0, 100);

  if (!query || !books?.length) {
    return NextResponse.json({ error: "A query and books are required." }, { status: 400 });
  }

  const response = await fetch("https://freellm-rho.vercel.app/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "free-router",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You rank audiobooks for semantic search. Return only valid JSON in this exact shape: {\"ids\":[number,...]}. Rank every supplied book from best to worst match. Do not add markdown or commentary.",
        },
        {
          role: "user",
          content: `Listener request: ${query}\n\nCatalog:\n${JSON.stringify(books)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Semantic search is temporarily unavailable." }, { status: 502 });
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = result.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content ?? "") as { ids?: number[] };
    const validIds = parsed.ids?.filter((id) => books.some((book) => book.id === id));
    if (!validIds?.length) throw new Error("No valid rankings returned");
    return NextResponse.json({ ids: validIds });
  } catch {
    return NextResponse.json({ error: "Search returned an invalid result." }, { status: 502 });
  }
}
