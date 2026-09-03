const API = "https://api.agentmail.to/v0";

export type ProvisionedInbox = {
  id: string;
  address: string;
  provider: "agentmail";
};

function key(): string | undefined {
  return process.env.AGENTMAIL_API_KEY;
}

export function agentMailEnabled(): boolean {
  return Boolean(key());
}

export async function provisionInbox(
  username: string,
  clientId: string,
): Promise<ProvisionedInbox | null> {
  const apiKey = key();
  if (!apiKey) return null;
  const slug = username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  try {
    const res = await fetch(`${API}/inboxes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: slug,
        client_id: clientId,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      inbox_id?: string;
      inboxId?: string;
      email?: string;
      address?: string;
    };
    const id = json.inbox_id || json.inboxId;
    const address = json.email || json.address;
    if (!id || !address) return null;
    return { id, address, provider: "agentmail" };
  } catch {
    return null;
  }
}

export async function sendAgentMail(input: {
  inboxId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const apiKey = key();
  if (!apiKey || !input.to.includes("@") || !input.inboxId) return false;
  try {
    const res = await fetch(`${API}/inboxes/${input.inboxId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [input.to],
        subject: input.subject,
        text: input.body,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type InboundPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
  inboxId: string;
};

export function parseAgentMailWebhook(raw: unknown): InboundPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const msg =
    (obj.message as Record<string, unknown> | undefined) ||
    (obj.data as Record<string, unknown> | undefined) ||
    obj;
  const from =
    String(msg.from ?? msg.from_email ?? "") ||
    String((msg.from as { email?: string } | undefined)?.email ?? "");
  const to = String(msg.to ?? msg.to_email ?? obj.inbox ?? "");
  const text = String(msg.text ?? msg.body ?? msg.preview ?? "");
  const subject = String(msg.subject ?? "Inbound");
  const inboxId = String(
    msg.inbox_id ?? msg.inboxId ?? obj.inbox_id ?? obj.inboxId ?? "",
  );
  if (text.trim().length < 8) return null;
  return { from, to, subject, text, inboxId };
}
