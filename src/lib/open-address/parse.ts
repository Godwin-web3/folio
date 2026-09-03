import type { InboundParse, NoticeParse } from "./types";
import { addDaysIso, todayIso } from "./ids";

export function fallbackNotice(raw: string): NoticeParse {
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

export function fallbackInbound(body: string, today: string): InboundParse {
  const lower = body.toLowerCase();
  const promise = /will (fix|repair|send|pay)|friday|next week|by \w+day/.test(
    lower,
  );
  const denial = /denied|will not|no refund|not responsible/.test(lower);
  const court = /court date|appearance|summons/.test(lower);
  return {
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
}
