import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { caseInbox, COOK, nextStatus, todayIso } from "./lib";

async function requireFile(
  ctx: { db: any },
  fileId: any,
  userId: string,
) {
  const file = await ctx.db.get(fileId);
  if (!file) throw new Error("File not found");
  if (file.userId !== userId) {
    const members = await ctx.db
      .query("fileMembers")
      .withIndex("by_file", (q: any) => q.eq("fileId", fileId))
      .collect();
    if (!members.some((m: { userId: string }) => m.userId === userId)) {
      throw new Error("File not found");
    }
  }
  return file;
}

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const owned = await ctx.db
      .query("addressFiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const memberRows = await ctx.db
      .query("fileMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const shared = [];
    for (const m of memberRows) {
      const f = await ctx.db.get(m.fileId);
      if (f) shared.push(f);
    }
    return [...owned, ...shared];
  },
});

export const get = query({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId, fileId }) => {
    const file = await requireFile(ctx, fileId, userId);
    const [parties, notices, records, issues, claims, messages, exhibits, deadlines, events] =
      await Promise.all([
        ctx.db.query("parties").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("notices").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("records").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("issues").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("claims").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("messages").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("exhibits").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("deadlines").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
        ctx.db.query("timelineEvents").withIndex("by_file", (q) => q.eq("fileId", fileId)).collect(),
      ]);
    return {
      file,
      parties,
      notices,
      records,
      issues,
      claims,
      messages,
      exhibits,
      deadlines,
      events,
    };
  },
});

export const create = mutation({
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
    caseInbox: v.optional(v.string()),
    mailInboxId: v.optional(v.string()),
    mailProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const inbox = args.caseInbox || caseInbox(args.street, args.unit);
    const fileId = await ctx.db.insert("addressFiles", {
      userId: args.userId,
      street: args.street.trim(),
      unit: args.unit.trim(),
      city: args.city.trim() || "Chicago",
      state: args.state.trim() || "IL",
      zip: args.zip.trim(),
      jurisdiction: COOK.id,
      status: "opened",
      caseInbox: inbox,
      mailInboxId: args.mailInboxId,
      mailProvider: args.mailProvider || "mailto",
    });
    if (args.tenantName.trim()) {
      await ctx.db.insert("parties", {
        fileId,
        userId: args.userId,
        kind: "tenant",
        name: args.tenantName.trim(),
        email: args.tenantEmail ?? "",
        org: "",
      });
    }
    if (args.ownerName || args.ownerEmail) {
      await ctx.db.insert("parties", {
        fileId,
        userId: args.userId,
        kind: "owner",
        name: args.ownerName || "Landlord",
        email: args.ownerEmail ?? "",
        org: args.ownerName || "",
      });
    }
    if (args.clinicEmail) {
      await ctx.db.insert("parties", {
        fileId,
        userId: args.userId,
        kind: "clinic",
        name: "Legal aid",
        email: args.clinicEmail,
        org: "Legal aid",
      });
    }
    await ctx.db.insert("timelineEvents", {
      fileId,
      userId: args.userId,
      kind: "opened",
      title: `File opened for ${args.street}`,
      detail: `Inbox ${inbox}`,
    });
    return fileId;
  },
});

export const ingestNotice = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    noticeType: v.string(),
    servedOn: v.optional(v.string()),
    deadlineOn: v.optional(v.string()),
    plaintiff: v.string(),
    amountCents: v.optional(v.number()),
    reason: v.string(),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await requireFile(ctx, args.fileId, args.userId);
    await ctx.db.insert("notices", {
      fileId: args.fileId,
      userId: file.userId,
      noticeType: args.noticeType,
      servedOn: args.servedOn,
      deadlineOn: args.deadlineOn,
      plaintiff: args.plaintiff,
      amountCents: args.amountCents,
      reason: args.reason,
      rawText: args.rawText,
      source: "paste",
    });
    if (args.deadlineOn) {
      await ctx.db.insert("deadlines", {
        fileId: args.fileId,
        userId: file.userId,
        kind: "notice",
        title: "Respond to notice / cure or appear",
        dueOn: args.deadlineOn,
      });
    }
    await ctx.db.patch(args.fileId, {
      status: nextStatus(file.status, "notice_received"),
    });
    await ctx.db.insert("timelineEvents", {
      fileId: args.fileId,
      userId: file.userId,
      kind: "notice",
      title: `${args.noticeType.replaceAll("_", " ")} filed on the docket`,
      detail: args.plaintiff,
    });
  },
});

export const addEvent = mutation({
  args: {
    fileId: v.id("addressFiles"),
    userId: v.string(),
    kind: v.string(),
    title: v.string(),
    detail: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("timelineEvents", args);
  },
});

export const setStatus = mutation({
  args: {
    fileId: v.id("addressFiles"),
    status: v.string(),
  },
  handler: async (ctx, { fileId, status }) => {
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");
    await ctx.db.patch(fileId, { status: nextStatus(file.status, status) });
  },
});

export { todayIso };
