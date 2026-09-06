import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { COOK, nextStatus, todayIso } from "./lib";
import { requireFile, requireMessage, resolveUserId } from "./authz";

async function insertInbound(
  ctx: { db: any },
  args: {
    fileId: any;
    from: string;
    body: string;
    classification: string;
    summary: string;
    promiseOn?: string;
  },
) {
  const file = await ctx.db.get(args.fileId);
  if (!file) throw new Error("File not found");
  let relatedClaimId: string | undefined;
  // Durable dated claims only — never invent a due date.
  if (args.classification === "promise" && args.promiseOn) {
    relatedClaimId = await ctx.db.insert("claims", {
      fileId: args.fileId,
      userId: file.userId,
      kind: "promise",
      description: args.summary,
      statute: COOK.habitability,
      status: "open",
      promisedOn: todayIso(),
      dueOn: args.promiseOn,
    });
    await ctx.db.insert("deadlines", {
      fileId: args.fileId,
      userId: file.userId,
      kind: "promise",
      title: "Landlord repair promise",
      dueOn: args.promiseOn,
    });
  }
  await ctx.db.insert("messages", {
    fileId: args.fileId,
    userId: file.userId,
    direction: "inbound",
    toEmail: file.caseInbox,
    fromEmail: args.from,
    subject: "Inbound",
    body: args.body,
    classification: args.classification,
    status: "received",
    relatedClaimId,
  });
  if (relatedClaimId && args.promiseOn) {
    await ctx.db.insert("timelineEvents", {
      fileId: args.fileId,
      userId: file.userId,
      kind: "claim",
      title: `Claim stamped · ${args.promiseOn}`,
      detail: args.summary,
    });
  }
  await ctx.db.patch(args.fileId, {
    status: nextStatus(file.status, "answered"),
  });
}

export const approveSend = action({
  args: { userId: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { userId: claimed, messageId }): Promise<string> => {
    const userId = claimed;
    const msg = await ctx.runQuery(api.mail.getMessage, { userId, messageId });
    if (!msg) throw new Error("Message not found");
    const file = await ctx.runQuery(api.files.get, { userId, fileId: msg.fileId });
    let via: string = file.file.mailProvider || "mailto";
    const key = process.env.AGENTMAIL_API_KEY;
    if (key && file.file.mailInboxId && msg.toEmail) {
      const res = await fetch(
        `https://api.agentmail.to/v0/inboxes/${file.file.mailInboxId}/messages/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: [msg.toEmail],
            subject: msg.subject,
            text: msg.body,
          }),
        },
      );
      if (res.ok) via = "agentmail";
    }
    await ctx.runMutation(internal.mail.markSent, {
      messageId,
      via,
      fileId: msg.fileId,
      classification: msg.classification,
    });
    return via;
  },
});

export const getMessage = query({
  args: { userId: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { userId: claimed, messageId }) => {
    const userId = await resolveUserId(ctx, claimed);
    return requireMessage(ctx, messageId, userId);
  },
});

export const markSent = internalMutation({
  args: {
    messageId: v.id("messages"),
    via: v.string(),
    fileId: v.id("addressFiles"),
    classification: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "sent",
      direction: "outbound",
      sentAt: Date.now(),
    });
    const file = await ctx.db.get(args.fileId);
    if (file && args.classification === "demand") {
      await ctx.db.patch(args.fileId, {
        status: nextStatus(file.status, "demand_sent"),
      });
    }
    if (file) {
      await ctx.db.insert("timelineEvents", {
        fileId: args.fileId,
        userId: file.userId,
        kind: "sent",
        title: `Sent via ${args.via}`,
        detail: "",
      });
    }
  },
});

/** Owner/member paste-reply path — requires verified/claimed user ownership. */
export const logInbound = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    from: v.string(),
    body: v.string(),
    classification: v.string(),
    summary: v.string(),
    promiseOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    await requireFile(ctx, args.fileId, userId);
    await insertInbound(ctx, args);
  },
});

/** Webhook-only inbound — not callable from the browser. */
export const logInboundInternal = internalMutation({
  args: {
    fileId: v.id("addressFiles"),
    from: v.string(),
    body: v.string(),
    classification: v.string(),
    summary: v.string(),
    promiseOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await insertInbound(ctx, args);
  },
});

export const stampFriday = action({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, args): Promise<string> => {
    // Deny cross-user: must be able to load the file as this user.
    await ctx.runQuery(api.files.get, {
      userId: args.userId,
      fileId: args.fileId,
    });
    const d = new Date();
    const add = (5 - d.getUTCDay() + 7) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + add);
    const friday = d.toISOString().slice(0, 10);
    await ctx.runMutation(api.mail.logInbound, {
      userId: args.userId,
      fileId: args.fileId,
      from: "notices@northside-residential.example",
      body: `We'll send someone Friday ${friday}. Sorry about the wait.`,
      classification: "promise",
      summary: `Landlord promised repairs on ${friday}.`,
      promiseOn: friday,
    });
    return friday;
  },
});

export const findByInbox = internalQuery({
  args: { inbox: v.string() },
  handler: async (ctx, { inbox }) => {
    const key = inbox.trim();
    if (!key) return null;
    const byCase = await ctx.db
      .query("addressFiles")
      .withIndex("by_inbox", (q) => q.eq("caseInbox", key))
      .first();
    if (byCase) return byCase;
    return ctx.db
      .query("addressFiles")
      .withIndex("by_mail_inbox", (q) => q.eq("mailInboxId", key))
      .first();
  },
});
