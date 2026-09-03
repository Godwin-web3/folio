const KEY = "folio.guest";

export type FolioGuest = {
  email: string;
  name: string;
};

export function readGuest(): FolioGuest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FolioGuest>;
    const email = String(parsed.email ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) return null;
    return { email, name: String(parsed.name ?? email.split("@")[0]) };
  } catch {
    return null;
  }
}

export function saveGuest(guest: FolioGuest): FolioGuest {
  const next = {
    email: guest.email.trim().toLowerCase(),
    name: guest.name.trim() || guest.email.split("@")[0],
  };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearGuest(): void {
  window.localStorage.removeItem(KEY);
}

export function guestUserId(email: string): string {
  return email.trim().toLowerCase();
}
