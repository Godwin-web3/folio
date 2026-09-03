import type { Message } from "./types";

export function mailtoHref(msg: Pick<Message, "to_email" | "subject" | "body">): string | null {
  if (!msg.to_email || !msg.to_email.includes("@")) return null;
  const q = new URLSearchParams({
    subject: msg.subject,
    body: msg.body,
  });
  return `mailto:${msg.to_email}?${q.toString()}`;
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
