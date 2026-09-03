import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { COOK, todayIso } from "./lib";

type Crawled = {
  agency: string;
  kind: string;
  title: string;
  url: string;
  extracted: Record<string, unknown>;
  rawExcerpt: string;
};

async function soda<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Folio/1.0 (housing file)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

async function firecrawlScrape(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { markdown?: string } };
  return json.data?.markdown ?? null;
}

export const crawlBuilding = action({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId, fileId }) => {
    const bundle = await ctx.runQuery(api.files.get, { userId, fileId });
    const street = bundle.file.street;
    const needle = street
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const openWhere = encodeURIComponent(
      `upper(address) like '%${needle}%' AND violation_status='OPEN'`,
    );
    const anyWhere = encodeURIComponent(`upper(address) like '%${needle}%'`);
    const [open, licenses, legal] = await Promise.all([
      soda<Record<string, string>>(
        `${COOK.violationsApi}?$limit=8&$order=violation_date DESC&$where=${openWhere}`,
      ),
      soda<Record<string, string>>(
        `${COOK.licensesApi}?$limit=4&$order=date_issued DESC&$where=${anyWhere}`,
      ),
      firecrawlScrape(COOK.legalAidUrl),
    ]);
    let violations = open;
    if (violations.length === 0) {
      violations = await soda<Record<string, string>>(
        `${COOK.violationsApi}?$limit=8&$order=violation_date DESC&$where=${anyWhere}`,
      );
    }
    const crawled: Crawled[] = [];
    for (const v of violations) {
      crawled.push({
        agency: "Chicago Buildings",
        kind: "violation",
        title: `${v.violation_status ?? "STATUS"} · ${v.violation_description ?? "Violation"}`,
        url: COOK.buildingsUrl,
        extracted: { status: v.violation_status ?? "", date: v.violation_date ?? "" },
        rawExcerpt: String(v.violation_ordinance ?? "").slice(0, 500),
      });
    }
    for (const lic of licenses) {
      crawled.push({
        agency: "Chicago Business Affairs",
        kind: "license",
        title: `${lic.license_description ?? "License"} · ${lic.doing_business_as_name ?? ""}`,
        url: COOK.licensesApi,
        extracted: { status: lic.license_status ?? "" },
        rawExcerpt: String(lic.legal_name ?? ""),
      });
    }
    crawled.push({
      agency: legal ? "Firecrawl · Illinois Legal Aid" : "Illinois Legal Aid",
      kind: "self_help",
      title: "Avoiding eviction — Illinois self-help",
      url: COOK.legalAidUrl,
      extracted: { fiveDay: COOK.fiveDay },
      rawExcerpt: (legal ?? COOK.fiveDay).slice(0, 1200),
    });
    await ctx.runMutation(api.buildingStore.replace, {
      userId,
      fileId,
      records: crawled.map((c) => ({
        ...c,
        extracted: JSON.stringify(c.extracted),
      })),
    });
    return crawled.length;
  },
});
