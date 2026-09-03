import type { AddressFile, FileStatus } from "./types";

export type FileStep = "notice" | "letters" | "packet";

export const FILE_STEPS: { id: FileStep; n: number; label: string }[] = [
  { id: "notice", n: 2, label: "Notice" },
  { id: "letters", n: 3, label: "Letters" },
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
  if (n > 1) return `Due in ${n} days`;
  if (n === 1) return "Due tomorrow";
  if (n === 0) return "Due today";
  if (n === -1) return "1 day late";
  return `${Math.abs(n)} days late`;
}

export function parseFileStep(value: unknown): FileStep {
  if (value === "letters" || value === "packet") return value;
  return "notice";
}
