import type { AddressFile, Claim, FileBundle, FileStatus } from "./types";

export type FileStep = "notice" | "letters" | "packet";

export const FILE_STEPS: { id: FileStep; n: number; label: string }[] = [
  { id: "notice", n: 2, label: "Notice" },
  { id: "letters", n: 3, label: "Letter" },
  { id: "packet", n: 4, label: "Packet" },
];

export function addressLabel(file: Pick<AddressFile, "street" | "unit">): string {
  return file.unit ? `${file.street}, Unit ${file.unit}` : file.street;
}

export function statusLabel(s: string): string {
  return s.replaceAll("_", " ");
}

export function recommendedStep(status: FileStatus): FileStep {
  if (
    status === "opened" ||
    status === "notice_received" ||
    status === "building_pulled"
  ) {
    return "notice";
  }
  if (
    status === "demand_drafted" ||
    status === "demand_sent" ||
    status === "answered"
  ) {
    return "letters";
  }
  return "packet";
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const due = Date.parse(`${iso}T12:00:00`);
  if (Number.isNaN(due)) return null;
  const now = new Date();
  const today = Date.parse(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T12:00:00`,
  );
  return Math.round((due - today) / 86_400_000);
}

export function deadlineCopy(iso: string | null | undefined): string | null {
  const n = daysUntil(iso);
  if (n == null) return null;
  if (n > 1) return `${n} days left`;
  if (n === 1) return "Due tomorrow";
  if (n === 0) return "Due today";
  if (n === -1) return "1 day late";
  return `${Math.abs(n)} days late`;
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function parseFileStep(value: unknown): FileStep {
  if (value === "letters" || value === "packet") return value;
  return "notice";
}

export function recommendedStepFromPulse(pulse: CasePulse): FileStep {
  if (!pulse.noticeLabel || pulse.cityCount === 0) return "notice";
  if (!pulse.promise) return "letters";
  return "packet";
}

export type CasePulse = {
  dueOn: string | null;
  days: number | null;
  daysCopy: string | null;
  noticeLabel: string | null;
  cityCount: number;
  promise: Claim | null;
  headline: string;
  sub: string;
};

export function casePulse(bundle: FileBundle): CasePulse {
  const notice = bundle.notices[0] ?? null;
  const dueOn =
    bundle.deadlines.find((d) => !d.completed_at)?.due_on ??
    notice?.deadline_on ??
    null;
  const days = daysUntil(dueOn);
  const cityCount = bundle.records.filter((r) => r.kind === "violation").length;
  const promise =
    bundle.claims.find((c) => c.kind === "promise") ??
    bundle.claims.find((c) => c.promised_on) ??
    null;
  const noticeLabel = notice ? statusLabel(notice.notice_type) : null;

  let headline = "File the notice. Then pull what Chicago already wrote.";
  let sub = "One apartment. The paper on the door, the city’s records, the date they name.";
  if (promise) {
    headline = `They promised ${formatDay(promise.due_on ?? promise.promised_on)}. That’s a claim.`;
    sub = promise.description || "Dated in writing. Not a vibe.";
  } else if (days != null && days < 0) {
    headline = `The notice is ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late.`;
    sub =
      cityCount > 0
        ? `Chicago already listed ${cityCount} open problem${cityCount === 1 ? "" : "s"} on this building.`
        : "Pull Chicago’s file before you walk into anything.";
  } else if (days != null) {
    headline =
      days === 0
        ? "The notice is due today."
        : days === 1
          ? "The notice is due tomorrow."
          : `${days} days on the notice.`;
    sub =
      cityCount > 0
        ? `Chicago already listed ${cityCount} open problem${cityCount === 1 ? "" : "s"} on this building.`
        : "Pull Chicago’s file. The city may already have this building on a list.";
  } else if (cityCount > 0) {
    headline = `Chicago listed ${cityCount} open problem${cityCount === 1 ? "" : "s"} on this building.`;
    sub = "That’s the city’s file, not your opinion. Put it in the letter.";
  }

  return {
    dueOn,
    days,
    daysCopy: deadlineCopy(dueOn),
    noticeLabel,
    cityCount,
    promise,
    headline,
    sub,
  };
}
