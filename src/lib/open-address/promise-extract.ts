/**
 * Structured inbound promise / date extraction.
 * Keep in sync with convex/lib/promiseExtract.ts
 *
 * Rules: never invent a due date. Only emit promiseOn when a concrete date or
 * weekday commitment is present alongside commitment language.
 */

export type InboundClassification =
  | "promise"
  | "denial"
  | "court_date"
  | "other";

export type PromiseExtraction = {
  classification: InboundClassification;
  promiseOn: string | null;
  summary: string;
  confidence: "high" | "low" | "none";
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const COMMITMENT =
  /\b(we(?:'ll| will)|i(?:'ll| will)|they(?:'ll| will)|will|can)\s+(send|fix|repair|come|schedule|have|be there|get)\b|\b(send|fix|repair|schedule)\s+(someone|a\s+technician|a\s+plumber|crew|repairs?)\b|\bscheduled?\b.{0,40}\b(repair|technician|plumber|visit)\b/i;

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWeekdayOnOrAfter(todayIso: string, weekday: number): string {
  const d = new Date(`${todayIso}T12:00:00Z`);
  const add = (weekday - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

function parseIsoLike(raw: string): string | null {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractExplicitDate(text: string, today: string): string | null {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) {
    const parsed = parseIsoLike(iso[1]);
    if (parsed) return parsed;
  }
  const us = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
  if (us) {
    const mm = us[1].padStart(2, "0");
    const dd = us[2].padStart(2, "0");
    const parsed = parseIsoLike(`${us[3]}-${mm}-${dd}`);
    if (parsed) return parsed;
  }
  const named = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/i,
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    const day = Number(named[2]);
    const year = named[3] ? Number(named[3]) : Number(today.slice(0, 4));
    if (month && day >= 1 && day <= 31) {
      const parsed = parseIsoLike(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
      if (parsed) {
        // If month/day already passed this year and no year given, roll forward
        if (!named[3] && parsed < today) {
          return parseIsoLike(
            `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          );
        }
        return parsed;
      }
    }
  }
  return null;
}

function extractWeekdayDate(text: string, today: string): string | null {
  const lower = text.toLowerCase();
  if (/\bnext week\b/.test(lower)) {
    // Too vague alone — only accept with commitment + treat as +7 if caller
    // already required commitment. Still a weak date; mark via return.
    return addDaysIso(today, 7);
  }
  for (const [name, idx] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      return nextWeekdayOnOrAfter(today, idx);
    }
  }
  return null;
}

/**
 * Extract classification + optional due date from inbound landlord mail.
 * Does not invent promises: commitment language without a date stays undated
 * (classification "other" or promise with null promiseOn — callers must not
 * create a dated claim without promiseOn).
 */
export function extractInboundPromise(
  body: string,
  today: string,
): PromiseExtraction {
  const summary = body.replace(/\s+/g, " ").trim().slice(0, 240);
  const lower = body.toLowerCase();

  if (/\b(court date|appearance|summons|eviction hearing)\b/.test(lower)) {
    return { classification: "court_date", promiseOn: null, summary, confidence: "high" };
  }
  if (/\b(denied|will not|won't|no refund|not responsible|refuse)\b/.test(lower)) {
    return { classification: "denial", promiseOn: null, summary, confidence: "high" };
  }

  const hasCommitment = COMMITMENT.test(body);
  if (!hasCommitment) {
    return { classification: "other", promiseOn: null, summary, confidence: "none" };
  }

  const explicit = extractExplicitDate(body, today);
  if (explicit) {
    return {
      classification: "promise",
      promiseOn: explicit,
      summary,
      confidence: "high",
    };
  }

  const weekday = extractWeekdayDate(body, today);
  if (weekday && !/\bnext week\b/i.test(body)) {
    return {
      classification: "promise",
      promiseOn: weekday,
      summary,
      confidence: "high",
    };
  }
  if (weekday && /\bnext week\b/i.test(body)) {
    // Commitment + "next week" → dated but lower confidence; still usable.
    return {
      classification: "promise",
      promiseOn: weekday,
      summary,
      confidence: "low",
    };
  }

  // Commitment without any date — do not invent a due date.
  return {
    classification: "other",
    promiseOn: null,
    summary: summary || "Undated repair commitment (no date extracted)",
    confidence: "low",
  };
}
