/** User-visible copy for Convex / form failures. Never returns an empty string. */
export function folioActionError(
  err: unknown,
  fallback = "That did not save",
): string {
  const chunks: string[] = [];
  if (typeof err === "string") chunks.push(err);
  if (err instanceof Error && err.message) chunks.push(err.message);
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; data?: unknown };
    if (typeof o.message === "string") chunks.push(o.message);
    if (typeof o.data === "string") chunks.push(o.data);
    else if (
      o.data &&
      typeof o.data === "object" &&
      "message" in o.data &&
      typeof (o.data as { message: unknown }).message === "string"
    ) {
      chunks.push((o.data as { message: string }).message);
    }
  }
  const raw = chunks.find((p) => p.trim()) ?? "";
  const cleaned = raw
    .replace(/\[CONVEX[^\]]*\]\s*/gi, "")
    .replace(/\[Request ID:[^\]]*\]\s*/gi, "")
    .replace(/\bServer Error\b/gi, "")
    .replace(/\bUncaught Error:\s*/gi, "")
    .replace(/\s+Called by client.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  if (/unauthorized/i.test(cleaned)) {
    return "Could not open that file. Sign in again and retry.";
  }
  return cleaned;
}

export type OpenFileFormInput = {
  street: string;
  unit: string;
  zip: string;
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
};

/** Trim + validate the “Open this file” form. Throws a tenant-facing Error. */
export function prepareOpenFileInput(input: OpenFileFormInput): {
  street: string;
  unit: string;
  city: "Chicago";
  state: "IL";
  zip: string;
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
} {
  const street = input.street.trim();
  const unit = input.unit.trim();
  const zip = input.zip.trim();
  const tenantName = input.tenantName.trim();
  const ownerName = input.ownerName.trim();
  const ownerEmail = input.ownerEmail.trim();
  if (street.length < 3) {
    throw new Error(
      "Street needs a number and name, like 1757 W Berteau Ave.",
    );
  }
  return {
    street,
    unit,
    city: "Chicago",
    state: "IL",
    zip,
    tenantName,
    ownerName,
    ownerEmail,
  };
}
