export const COOK = {
  id: "cook-county-il",
  legalAidUrl: "https://www.illinoislegalaid.org/legal-information/avoiding-eviction",
  fiveDay: "Illinois 735 ILCS 5/9-209 — five-day notice for nonpayment of rent.",
  retaliation:
    "765 ILCS 720 — eviction within one year of a code complaint is presumed retaliatory.",
  habitability:
    "Chicago RLTO + municipal code. Open building violations support a habitability defense or set-off.",
  violationsApi: "https://data.cityofchicago.org/resource/22u3-xenr.json",
  licensesApi: "https://data.cityofchicago.org/resource/r5kz-chrr.json",
  buildingsUrl: "https://data.cityofchicago.org/Buildings/Building-Violations/22u3-xenr",
  demoNotice: `FIVE DAY NOTICE

TO: Maya Chen
PREMISES: 1757 W Berteau Ave, Apt 2F, Chicago, IL 60613

You are hereby notified that there is now due the undersigned landlord the sum of ONE THOUSAND EIGHT HUNDRED FORTY AND 00/100 DOLLARS ($1,840.00) being rent for the period of August 2026 for the above premises.

Unless payment of the above sum is made on or before five (5) days after service of this notice, your lease will be terminated.

LANDLORD: Northside Residential LLC
c/o Harbor Property Group
Date of service: September 1, 2026`,
} as const;

export function todayIso(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function caseInbox(street: string, unit: string): string {
  const slug = `${unit || "unit"}-${street}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  return `${slug}@folio.mail`;
}

const RANK = [
  "opened",
  "notice_received",
  "building_pulled",
  "demand_drafted",
  "demand_sent",
  "answered",
  "packet_ready",
];

export function nextStatus(current: string, next: string): string {
  return RANK.indexOf(next) < RANK.indexOf(current) ? current : next;
}
