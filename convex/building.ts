import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { COOK } from "./lib";
import {
  MATCH_ACCEPT_THRESHOLD,
  scoreAddressMatch,
  sodaAddressParts,
} from "./lib/addressMatch";

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

function filterMatched(
  fileStreet: string,
  rows: Record<string, string>[],
): { kept: Record<string, string>[]; skipped: number } {
  const kept: Record<string, string>[] = [];
  let skipped = 0;
  for (const row of rows) {
    const candidate = String(row.address ?? "");
    const match = scoreAddressMatch(fileStreet, candidate);
    if (!match.accept) {
      skipped += 1;
      continue;
    }
    kept.push({
      ...row,
      _matchScore: String(match.score),
      _matchReason: match.reason,
    });
  }
  return { kept, skipped };
}

export const crawlBuilding = action({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId, fileId }) => {
    const bundle = await ctx.runQuery(api.files.get, { userId, fileId });
    const street = bundle.file.street;
    const parts = sodaAddressParts(street);
    if (!parts) {
      // Too weak to query — store self-help only, do not LIKE-match loosely.
      const legal = await firecrawlScrape(COOK.legalAidUrl);
      const crawled: Crawled[] = [
        {
          agency: legal ? "Firecrawl · Illinois Legal Aid" : "Illinois Legal Aid",
          kind: "self_help",
          title: "Avoiding eviction — Illinois self-help",
          url: COOK.legalAidUrl,
          extracted: { fiveDay: COOK.fiveDay, matchNote: "address_too_weak_for_soda" },
          rawExcerpt: (legal ?? COOK.fiveDay).slice(0, 1200),
        },
      ];
      await ctx.runMutation(api.buildingStore.replace, {
        userId,
        fileId,
        records: crawled.map((c) => ({
          ...c,
          extracted: JSON.stringify(c.extracted),
        })),
      });
      return crawled.length;
    }

    // Prefer number + street-name containment over bare LIKE on the full string.
    const openWhere = encodeURIComponent(
      `upper(address) like '${parts.number} %' AND upper(address) like '%${parts.nameNeedle}%' AND violation_status='OPEN'`,
    );
    const anyWhere = encodeURIComponent(
      `upper(address) like '${parts.number} %' AND upper(address) like '%${parts.nameNeedle}%'`,
    );
    const [open, licenses, legal] = await Promise.all([
      soda<Record<string, string>>(
        `${COOK.violationsApi}?$limit=20&$order=violation_date DESC&$where=${openWhere}`,
      ),
      soda<Record<string, string>>(
        `${COOK.licensesApi}?$limit=8&$order=date_issued DESC&$where=${anyWhere}`,
      ),
      firecrawlScrape(COOK.legalAidUrl),
    ]);
    let violations = open;
    if (violations.length === 0) {
      violations = await soda<Record<string, string>>(
        `${COOK.violationsApi}?$limit=20&$order=violation_date DESC&$where=${anyWhere}`,
      );
    }

    const violFiltered = filterMatched(street, violations);
    const licFiltered = filterMatched(street, licenses);

    const crawled: Crawled[] = [];
    for (const v of violFiltered.kept) {
      crawled.push({
        agency: "Chicago Buildings",
        kind: "violation",
        title: `${v.violation_status ?? "STATUS"} · ${v.violation_description ?? "Violation"}`,
        url: COOK.buildingsUrl,
        extracted: {
          status: v.violation_status ?? "",
          date: v.violation_date ?? "",
          address: v.address ?? "",
          matchScore: Number(v._matchScore ?? 0),
          matchReason: v._matchReason ?? "",
          threshold: MATCH_ACCEPT_THRESHOLD,
        },
        rawExcerpt: String(v.violation_ordinance ?? "").slice(0, 500),
      });
    }
    for (const lic of licFiltered.kept) {
      crawled.push({
        agency: "Chicago Business Affairs",
        kind: "license",
        title: `${lic.license_description ?? "License"} · ${lic.doing_business_as_name ?? ""}`,
        url: COOK.licensesApi,
        extracted: {
          status: lic.license_status ?? "",
          address: lic.address ?? "",
          matchScore: Number(lic._matchScore ?? 0),
          matchReason: lic._matchReason ?? "",
        },
        rawExcerpt: String(lic.legal_name ?? ""),
      });
    }
    const skipped = violFiltered.skipped + licFiltered.skipped;
    crawled.push({
      agency: legal ? "Firecrawl · Illinois Legal Aid" : "Illinois Legal Aid",
      kind: "self_help",
      title: "Avoiding eviction — Illinois self-help",
      url: COOK.legalAidUrl,
      extracted: {
        fiveDay: COOK.fiveDay,
        skippedLowConfidenceMatches: skipped,
        matchThreshold: MATCH_ACCEPT_THRESHOLD,
      },
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
