import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { addDaysIso, COOK, nextStatus, todayIso } from "./lib";

export const approveSend = action({
  args: { userId: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { userId, messageId }): Promise<string> => {
    const msg = await ctx.runQuery(api.mail.getMessage, { messageId });
    if (!msg) throw new Error("Message not found");
    const file = await ctx.runQuery(api.files.get, { userId, fileId: msg.fileId });
    let via: string = file.file.mailProvider || "mailto";
    const key = process.env.AGENTMAIL_API_KEY;
    if (key && file.file.mailInboxId && msg.toEmail) {
      const res = await fetch(
        `https://api.agentmail.to/v0/inboxes/${file.file.mailInboxId}/messages`,
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
    await ctx.runMutation(api.mail.markSent, {
      messageId,
      via,
      fileId: msg.fileId,
      classification: msg.classification,
    });
    return via;
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => ctx.db.get(messageId),
});

export const markSent = mutation({
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

export const logInbound = mutation({
  args: {
    fileId: v.id("addressFiles"),
    from: v.string(),
    body: v.string(),
    classification: v.string(),
    summary: v.string(),
    promiseOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");
    let relatedClaimId: string | undefined;
    if (args.classification === "promise") {
      relatedClaimId = await ctx.db.insert("claims", {
        fileId: args.fileId,
        userId: file.userId,
        kind: "promise",
        description: args.summary,
        statute: COOK.habitability,
        status: "open",
        promisedOn: todayIso(),
        dueOn: args.promiseOn ?? addDaysIso(todayIso(), 3),
      });
      await ctx.db.insert("deadlines", {
        fileId: args.fileId,
        userId: file.userId,
        kind: "promise",
        title: "Landlord repair promise",
        dueOn: args.promiseOn ?? addDaysIso(todayIso(), 3),
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
    await ctx.db.patch(args.fileId, {
      status: nextStatus(file.status, "answered"),
    });
  },
});

export const findByInbox = query({
  args: { inbox: v.string() },
  handler: async (ctx, { inbox }) => {
    const byCase = await ctx.db
      .query("addressFiles")
      .withIndex("by_inbox", (q) => q.eq("caseInbox", inbox))
      .first();
    if (byCase) return byCase;
    return ctx.db
      .query("addressFiles")
      .withIndex("by_mail_inbox", (q) => q.eq("mailInboxId", inbox))
      .first();
  },
});
