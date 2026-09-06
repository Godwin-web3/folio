import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireFile, resolveUserId } from "./authz";
import { todayIso } from "./lib";

export const list = query({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    await requireFile(ctx, fileId, userId);
    const rows = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    return rows.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
  },
});

export const addEntry = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    kind: v.string(),
    amountCents: v.number(),
    note: v.optional(v.string()),
    occurredOn: v.optional(v.string()),
    relatedNoticeId: v.optional(v.id("notices")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    const file = await requireFile(ctx, args.fileId, userId);
    const kind = args.kind.trim().toLowerCase();
    if (!["charge", "payment", "adjustment", "notice"].includes(kind)) {
      throw new Error("Invalid ledger kind");
    }
    if (!Number.isFinite(args.amountCents)) {
      throw new Error("Invalid amount");
    }
    const id = await ctx.db.insert("ledgerEntries", {
      fileId: args.fileId,
      userId: file.userId,
      kind,
      amountCents: Math.round(args.amountCents),
      note: (args.note ?? "").trim(),
      occurredOn: args.occurredOn || todayIso(),
      relatedNoticeId: args.relatedNoticeId,
    });
    await ctx.db.insert("timelineEvents", {
      fileId: args.fileId,
      userId: file.userId,
      kind: "ledger",
      title: `Ledger ${kind}: $${(Math.abs(args.amountCents) / 100).toFixed(2)}`,
      detail: (args.note ?? "").trim(),
    });
    return id;
  },
});
