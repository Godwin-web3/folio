export type ParsedNotice = {
  noticeType: string;
  servedOn: string | null;
  deadlineOn: string | null;
  plaintiff: string;
  amountCents: number | null;
  reason: string;
  rawText: string;
};

const NOTICE_JSON_KEYS =
  "noticeType (use 5_day_pay_or_quit if it is a five-day rent notice, else a short snake_case type), servedOn (YYYY-MM-DD or null), deadlineOn (YYYY-MM-DD or null), plaintiff (landlord / plaintiff name), amountCents (integer cents or null), reason, rawText (full notice text)";

export function normalizeParsed(parsed: ParsedNotice, fallbackRaw: string): ParsedNotice {
  return {
    noticeType: parsed.noticeType || "5_day_pay_or_quit",
    servedOn: parsed.servedOn || null,
    deadlineOn: parsed.deadlineOn || null,
    plaintiff: (parsed.plaintiff || "").trim(),
    amountCents:
      typeof parsed.amountCents === "number" && Number.isFinite(parsed.amountCents)
        ? Math.round(parsed.amountCents)
        : null,
    reason: (parsed.reason || "").trim() || "nonpayment of rent",
    rawText: (parsed.rawText || fallbackRaw || "").trim(),
  };
}

/** Heuristic fallback when no LLM key is configured. */
export function fallbackNoticeParse(raw: string): ParsedNotice {
  const text = raw.replace(/\s+/g, " ").trim();
  const money = text.match(/\$([0-9][0-9,]*(?:\.[0-9]{2})?)/);
  const amountCents = money
    ? Math.round(Number(money[1].replace(/,/g, "")) * 100)
    : null;
  const served =
    text.match(
      /(?:Date of service|served)\s*[:on]*\s*([A-Za-z]+ \d{1,2}, \d{4})/i,
    )?.[1] ?? null;
  let servedOn: string | null = null;
  if (served) {
    const d = new Date(served);
    if (!Number.isNaN(d.getTime())) servedOn = d.toISOString().slice(0, 10);
  }
  const today = new Date().toISOString().slice(0, 10);
  servedOn = servedOn ?? today;
  const five = /five[-\s]?day/i.test(text);
  const ten = /ten[-\s]?day/i.test(text);
  const noticeType = five
    ? "5_day_pay_or_quit"
    : ten
      ? "10_day_lease_violation"
      : /pay or quit/i.test(text)
        ? "5_day_pay_or_quit"
        : "unknown";
  const plaintiff =
    text.match(/LANDLORD:\s*([^\n]+)/i)?.[1]?.trim() ??
    text.match(/([A-Z][A-Za-z0-9 .,&-]{2,}LLC)/)?.[1] ??
    "";
  const addDays = (iso: string, days: number) => {
    const d = new Date(iso + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return {
    noticeType,
    servedOn,
    deadlineOn: five || /pay or quit/i.test(text) ? addDays(servedOn, 5) : addDays(servedOn, 10),
    plaintiff: plaintiff.replace(/\s+/g, " ").slice(0, 120),
    amountCents,
    reason: /rent/i.test(text) ? "nonpayment of rent" : "lease issue",
    rawText: raw.trim(),
  };
}

type LlmAttempt = { url: string; key: string; model: string };

function llmAttempts(): LlmAttempt[] {
  const openai = process.env.OPENAI_API_KEY;
  const xai = process.env.XAI_API_KEY;
  return [
    openai
      ? { url: "https://api.openai.com/v1/chat/completions", key: openai, model: "gpt-4o-mini" }
      : null,
    xai
      ? { url: "https://api.x.ai/v1/chat/completions", key: xai, model: "grok-2-vision-1212" }
      : null,
  ].filter(Boolean) as LlmAttempt[];
}

async function chatJson(
  attempt: LlmAttempt,
  content: unknown,
): Promise<ParsedNotice | null> {
  const res = await fetch(attempt.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${attempt.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: attempt.model,
      temperature: 0,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as ParsedNotice;
  if (!parsed.rawText && typeof content === "string") {
    parsed.rawText = content.slice(0, 4000);
  }
  if (!parsed.rawText) return null;
  return normalizeParsed(parsed, parsed.rawText);
}

export async function parseNoticeFromText(rawText: string): Promise<{
  parsed: ParsedNotice;
  via: "openai" | "xai" | "fallback";
}> {
  const prompt =
    "Extract fields from this US landlord notice (Cook County / Chicago pay-or-quit style when applicable). Return JSON only with keys: " +
    NOTICE_JSON_KEYS +
    ".\n\nNOTICE:\n" +
    rawText.slice(0, 6000);

  const attempts = llmAttempts().filter((a) => a.model.includes("gpt") || a.url.includes("openai"));
  // Prefer OpenAI for text; fall back to any configured key.
  const order = attempts.length
    ? attempts
    : llmAttempts();
  for (const attempt of order) {
    try {
      // Text-only models: skip pure vision models that need images
      if (attempt.model.includes("vision") && !attempt.url.includes("openai")) continue;
      const parsed = await chatJson(attempt, prompt);
      if (parsed) {
        return {
          parsed: normalizeParsed({ ...parsed, rawText: parsed.rawText || rawText }, rawText),
          via: attempt.url.includes("openai") ? "openai" : "xai",
        };
      }
    } catch {
      continue;
    }
  }
  return { parsed: fallbackNoticeParse(rawText), via: "fallback" };
}

export async function parseNoticeFromImage(imageB64: string, mime = "image/jpeg"): Promise<{
  parsed: ParsedNotice;
  via: "openai" | "xai";
} | null> {
  const prompt =
    "This is a photo of a US landlord eviction / pay-or-quit notice on a door or in hand (Cook County / Chicago when applicable). Return JSON only with keys: " +
    NOTICE_JSON_KEYS;

  for (const attempt of llmAttempts()) {
    try {
      const parsed = await chatJson(attempt, [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mime};base64,${imageB64}` },
        },
      ]);
      if (parsed) {
        return {
          parsed,
          via: attempt.url.includes("openai") ? "openai" : "xai",
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
