import type { InboundParse, NoticeParse } from "./types";
import { addDaysIso, todayIso } from "./ids";

const MODEL = "grok-4.5";

async function chatJson(prompt: string): Promise<string | null> {
  const xai = process.env.XAI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (xai) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xai}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract structured facts from Illinois eviction notices and landlord emails. Return JSON only. Never give legal advice. If unsure, use null.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return body.choices?.[0]?.message?.content ?? null;
    }
  }
  if (openai) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 700,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract structured facts from Illinois eviction notices and landlord emails. Return JSON only. Never give legal advice. If unsure, use null.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return body.choices?.[0]?.message?.content ?? null;
  }
  return null;
}

function fallbackNotice(raw: string): NoticeParse {
  const text = raw.replace(/\s+/g, " ");
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
  servedOn = servedOn ?? todayIso();
  const five = /five[-\s]?day/i.test(text);
  const ten = /ten[-\s]?day/i.test(text);
  const noticeType = five
    ? "5_day_pay_or_quit"
    : ten
      ? "10_day_lease_violation"
      : "unknown";
  const plaintiff =
    text.match(/LANDLORD:\s*([^\n]+)/i)?.[1]?.trim() ??
    text.match(/undersigned landlord[^A-Z]*([A-Z][A-Za-z0-9 .,&-]+LLC)/)?.[1] ??
    "";
  return {
    noticeType,
    servedOn,
    deadlineOn: five ? addDaysIso(servedOn, 5) : addDaysIso(servedOn, 10),
    plaintiff: plaintiff.replace(/\s+/g, " ").slice(0, 120),
    amountCents,
    reason: /rent/i.test(text) ? "nonpayment of rent" : "lease issue",
  };
}

export async function parseNotice(raw: string): Promise<NoticeParse> {
  const fb = fallbackNotice(raw);
  const content = await chatJson(
    `Extract from this eviction notice. JSON keys: noticeType (5_day_pay_or_quit|10_day_lease_violation|30_day|unknown), servedOn (YYYY-MM-DD or null), deadlineOn (YYYY-MM-DD or null), plaintiff (string), amountCents (integer or null), reason (short string).\n\n${raw.slice(0, 4000)}`,
  );
  if (!content) return fb;
  try {
    const parsed = JSON.parse(content) as Partial<NoticeParse>;
    return {
      noticeType: parsed.noticeType || fb.noticeType,
      servedOn: parsed.servedOn || fb.servedOn,
      deadlineOn: parsed.deadlineOn || fb.deadlineOn,
      plaintiff: parsed.plaintiff || fb.plaintiff,
      amountCents:
        typeof parsed.amountCents === "number"
          ? parsed.amountCents
          : fb.amountCents,
      reason: parsed.reason || fb.reason,
    };
  } catch {
    return fb;
  }
}

export async function parseInbound(
  body: string,
  today: string,
): Promise<InboundParse> {
  const lower = body.toLowerCase();
  const promise = /will (fix|repair|send|pay)|friday|next week|by \w+day/.test(
    lower,
  );
  const denial = /denied|will not|no refund|not responsible/.test(lower);
  const court = /court date|appearance|summons/.test(lower);
  const fb: InboundParse = {
    classification: court
      ? "court_date"
      : promise
        ? "promise"
        : denial
          ? "denial"
          : "other",
    promiseOn: promise ? addDaysIso(today, 3) : null,
    summary: body.replace(/\s+/g, " ").slice(0, 240),
  };
  const content = await chatJson(
    `Classify this landlord/city email. JSON keys: classification (promise|denial|court_date|records_production|other), promiseOn (YYYY-MM-DD or null if they name a date, else null), summary (one sentence).\nToday is ${today}.\n\n${body.slice(0, 3000)}`,
  );
  if (!content) return fb;
  try {
    const parsed = JSON.parse(content) as Partial<InboundParse>;
    return {
      classification: parsed.classification || fb.classification,
      promiseOn: parsed.promiseOn ?? fb.promiseOn,
      summary: parsed.summary || fb.summary,
    };
  } catch {
    return fb;
  }
}

export async function draftDemand(input: {
  tenant: string;
  address: string;
  inbox: string;
  owner: string;
  ownerEmail: string;
  violations: string[];
  noticeType: string;
  deadlineOn: string | null;
  amount: string | null;
}): Promise<{ subject: string; body: string } | null> {
  const content = await chatJson(
    `Draft a short, firm, non-threatening demand email from a Chicago tenant. JSON keys: subject, body. Cite open building violations by description. Ask the landlord to confirm in writing any repair promise. CC the case inbox. Do not claim to be a lawyer. Facts:\n${JSON.stringify(input)}`,
  );
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { subject?: string; body?: string };
    if (!parsed.body) return null;
    return {
      subject: parsed.subject || "Written demand — repairs and notice",
      body: parsed.body,
    };
  } catch {
    return null;
  }
}
