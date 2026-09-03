import { COOK } from "./jurisdiction";
import type { CrawledRecord } from "./crawl";

const FIRECRAWL = "https://api.firecrawl.dev/v1";

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function firecrawlScrape(
  url: string,
): Promise<{ markdown: string; source: "firecrawl" | "fetch" } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (key) {
    try {
      const res = await fetch(`${FIRECRAWL}/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
        signal: AbortSignal.timeout(18_000),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { markdown?: string };
          markdown?: string;
        };
        const markdown = json.data?.markdown || json.markdown || "";
        if (markdown.trim()) return { markdown, source: "firecrawl" };
      }
    } catch {
      /* fall through */
    }
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const markdown = htmlToText(html).slice(0, 8000);
    if (!markdown) return null;
    return { markdown, source: "fetch" };
  } catch {
    return null;
  }
}

export async function firecrawlSearch(
  query: string,
): Promise<{ title: string; url: string; excerpt: string }[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${FIRECRAWL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 4 }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { title?: string; url?: string; description?: string }[];
    };
    return (json.data ?? []).map((d) => ({
      title: d.title ?? "Search hit",
      url: d.url ?? "",
      excerpt: (d.description ?? "").slice(0, 500),
    }));
  } catch {
    return [];
  }
}

export async function crawlLegalAndSearch(
  street: string,
): Promise<CrawledRecord[]> {
  const out: CrawledRecord[] = [];
  const help = await firecrawlScrape(COOK.legalAidUrl);
  if (help) {
    out.push({
      agency: help.source === "firecrawl" ? "Firecrawl · Illinois Legal Aid" : "Illinois Legal Aid",
      kind: "self_help",
      title: "Avoiding eviction — Illinois self-help",
      url: COOK.legalAidUrl,
      extracted: {
        source: help.source,
        fiveDay: COOK.fiveDay,
        retaliation: COOK.retaliation,
      },
      rawExcerpt: help.markdown.slice(0, 1200),
    });
  }
  const hits = await firecrawlSearch(
    `${street} Chicago building violations open code`,
  );
  for (const hit of hits) {
    out.push({
      agency: "Firecrawl search",
      kind: "web",
      title: hit.title,
      url: hit.url,
      extracted: { source: "firecrawl" },
      rawExcerpt: hit.excerpt,
    });
  }
  return out;
}
