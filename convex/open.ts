import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { caseInbox } from "./lib";

async function provisionInbox(
  displayName: string,
): Promise<{ id: string; address: string } | null> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.agentmail.to/v0/inboxes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ display_name: displayName.slice(0, 80) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      inbox_id?: string;
      inboxId?: string;
      email?: string;
      address?: string;
    };
    const id = json.inbox_id || json.inboxId;
    if (!id) return null;
    const address = json.email || json.address || (id.includes("@") ? id : `${id}@agentmail.to`);
    return { id, address };
  } catch {
    return null;
  }
}

export const openFile = action({
  args: {
    userId: v.string(),
    street: v.string(),
    unit: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    clinicEmail: v.optional(v.string()),
    demoKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"addressFiles">> => {
    const fallback = caseInbox(args.street, args.unit);
    const mail = await provisionInbox(
      `Folio ${args.unit ? `${args.street} ${args.unit}` : args.street}`,
    );
    return ctx.runMutation(api.files.create, {
      userId: args.userId,
      street: args.street,
      unit: args.unit,
      city: args.city,
      state: args.state,
      zip: args.zip,
      tenantName: args.tenantName,
      tenantEmail: args.tenantEmail,
      ownerName: args.ownerName,
      ownerEmail: args.ownerEmail,
      clinicEmail: args.clinicEmail,
      demoKey: args.demoKey,
      caseInbox: mail?.address ?? fallback,
      mailInboxId: mail?.id,
      mailProvider: mail ? "agentmail" : "mailto",
    });
  },
});
