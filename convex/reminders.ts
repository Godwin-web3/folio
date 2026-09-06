import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireFile, resolveUserId } from "./authz";
import { todayIso } from "./lib";
import type { Doc, Id } from "./_generated/dataModel";

/** Insert a scheduled email reminder for a file. Skips when toEmail empty. */
export async function scheduleForFile(
  ctx: { db: any },
  args: {
    fileId: Id<"addressFiles">;
    userId: string;
    kind: string;
    dueOn: string;
    toEmail: string;
  },
) {
  const toEmail = (args.toEmail ?? "").trim();
  if (!toEmail) return null;
  return ctx.db.insert("reminders", {
    fileId: args.fileId,
    userId: args.userId,
    kind: args.kind,
    dueOn: args.dueOn,
    channel: "email",
    status: "scheduled",
    toEmail,
  });
}

export const list = query({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    await requireFile(ctx, fileId, userId);
    return ctx.db
      .query("reminders")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
  },
});

export const schedule = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    kind: v.string(),
    dueOn: v.string(),
    toEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    const file = await requireFile(ctx, args.fileId, userId);
    let toEmail = (args.toEmail ?? "").trim();
    if (!toEmail) {
      const parties = await ctx.db
        .query("parties")
        .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
        .collect();
      const tenant = parties.find((p) => p.kind === "tenant" && p.email);
      toEmail = tenant?.email?.trim() ?? "";
    }
    if (!toEmail) return null;
    return scheduleForFile(ctx, {
      fileId: args.fileId,
      userId: file.userId,
      kind: args.kind,
      dueOn: args.dueOn,
      toEmail,
    });
  },
});

export const dueScheduled = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }): Promise<Doc<"reminders">[]> => {
    const rows = await ctx.db
      .query("reminders")
      .withIndex("by_status_due", (q) => q.eq("status", "scheduled"))
      .collect();
    return rows.filter((r) => r.dueOn <= today);
  },
});

export const markSent = internalMutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, { reminderId }) => {
    const row = await ctx.db.get(reminderId);
    if (!row || row.status !== "scheduled") return;
    await ctx.db.patch(reminderId, { status: "sent", sentAt: Date.now() });
    await ctx.db.insert("timelineEvents", {
      fileId: row.fileId,
      userId: row.userId,
      kind: "reminder",
      title: `Reminder emailed (${row.kind})`,
      detail: row.toEmail,
    });
  },
});

export const getReminderContext = internalQuery({
  args: { reminderId: v.id("reminders") },
  handler: async (
    ctx,
    { reminderId },
  ): Promise<{
    reminder: Doc<"reminders">;
    file: Doc<"addressFiles">;
  } | null> => {
    const row = await ctx.db.get(reminderId);
    if (!row) return null;
    const file = await ctx.db.get(row.fileId);
    if (!file) return null;
    return { reminder: row, file };
  },
});

/** Daily cron: send due scheduled reminders via AgentMail when configured. */
export const processDue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; sent: number }> => {
    const today = todayIso();
    const due: Doc<"reminders">[] = await ctx.runQuery(
      internal.reminders.dueScheduled,
      { today },
    );
    const key = process.env.AGENTMAIL_API_KEY;
    let sent = 0;
    for (const row of due) {
      const pack = await ctx.runQuery(internal.reminders.getReminderContext, {
        reminderId: row._id,
      });
      if (!pack) continue;
      const { reminder, file } = pack;
      const toEmail = (reminder.toEmail ?? "").trim();
      if (!toEmail) continue;
      if (key && file.mailInboxId) {
        try {
          const res = await fetch(
            `https://api.agentmail.to/v0/inboxes/${file.mailInboxId}/messages/send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: [toEmail],
                subject: `Folio reminder — ${file.street}${file.unit ? ` ${file.unit}` : ""}`,
                text: [
                  `This is an automated Folio deadline reminder (${reminder.kind}).`,
                  `Due on: ${reminder.dueOn}`,
                  `Address: ${file.street}${file.unit ? `, Unit ${file.unit}` : ""}, ${file.city} ${file.state}`,
                  ``,
                  `Folio is a written record tool, not a lawyer. This is not legal advice.`,
                ].join("\n"),
              }),
            },
          );
          if (!res.ok) continue;
        } catch {
          continue;
        }
      } else {
        continue;
      }
      await ctx.runMutation(internal.reminders.markSent, {
        reminderId: reminder._id,
      });
      sent += 1;
    }
    return { checked: due.length, sent };
  },
});

/** Manual trigger (authenticated). */
export const runDueNow = action({
  args: { userId: v.string() },
  handler: async (
    ctx,
    { userId: claimed },
  ): Promise<{ checked: number; sent: number }> => {
    await resolveUserId(ctx, claimed);
    return ctx.runAction(internal.reminders.processDue, {});
  },
});
