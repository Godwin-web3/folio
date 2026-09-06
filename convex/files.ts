import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { caseInbox, nextStatus, todayIso } from "./lib";
import { requireFile, resolveUserId } from "./authz";
import { scheduleForFile } from "./reminders";
import { DEFAULT_JURISDICTION_ID, getJurisdiction } from "./lib/jurisdictions";

/**
 * Watch-link model (share-by-link):
 * - `watchKey` is a high-entropy capability URL for READ access (legal aid / clinic).
 * - `getByWatch` is the only public entry that accepts watchKey.
 * - Mutations never accept watchKey; strangers cannot write, ingest, send mail,
 *   replace records, or change status via a watch link alone.
 * - Owners revoke via `revokeWatchKey` (clears watchKey; old links stop working).
 */

function newWatchKey() {
  return crypto.randomUUID().replaceAll("-", "");
}

async function bundleOf(ctx: { db: any; storage: any }, file: any) {
  const fileId = file._id;
  const [parties, noticesRaw, records, issues, claims, messages, exhibits, deadlines, events, ledger, checklist] =
    await Promise.all([
      ctx.db.query("parties").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("notices").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("records").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("issues").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("claims").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("messages").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("exhibits").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("deadlines").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("timelineEvents").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("ledgerEntries").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
      ctx.db.query("checklistItems").withIndex("by_file", (q: any) => q.eq("fileId", fileId)).collect(),
    ]);
  const notices = [];
  for (const n of noticesRaw) {
    notices.push({
      ...n,
      noticePhotoUrl: n.storageId ? await ctx.storage.getUrl(n.storageId) : null,
      proofPhotoUrl: n.servedPhotoStorageId
        ? await ctx.storage.getUrl(n.servedPhotoStorageId)
        : null,
    });
  }
  const j = getJurisdiction(file.jurisdiction);
  return {
    file: {
      ...file,
      jurisdictionLabel: file.jurisdictionLabel ?? j.label,
    },
    parties,
    notices,
    records,
    issues,
    claims,
    messages,
    exhibits,
    deadlines,
    events,
    ledger,
    checklist,
  };
}

/** Read-only watch bundle — same content needed for packet print; no mutate hooks. */
async function watchBundleOf(ctx: { db: any; storage: any }, file: any) {
  const bundle = await bundleOf(ctx, file);
  return {
    ...bundle,
    file: {
      ...bundle.file,
      // Capability is the watchKey itself; do not echo mail provider internals.
      mailInboxId: undefined,
    },
    _watchAccess: "read_only" as const,
  };
}

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId: claimed }) => {
    const userId = await resolveUserId(ctx, claimed);
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
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    return bundleOf(ctx, file);
  },
});

export const getByWatch = query({
  args: { watchKey: v.string() },
  handler: async (ctx, { watchKey }) => {
    const key = watchKey.trim();
    if (key.length < 16 || key.length > 128) return null;
    const file = await ctx.db
      .query("addressFiles")
      .withIndex("by_watch", (q) => q.eq("watchKey", key))
      .first();
    if (!file) return null;
    return watchBundleOf(ctx, file);
  },
});

export const ensureWatchKey = mutation({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    if (file.watchKey) return file.watchKey;
    const watchKey = newWatchKey();
    await ctx.db.patch(fileId, { watchKey });
    return watchKey;
  },
});

export const revokeWatchKey = mutation({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    if (file.watchKey) {
      await ctx.db.patch(fileId, { watchKey: undefined });
      await ctx.db.insert("timelineEvents", {
        fileId,
        userId: file.userId,
        kind: "watch",
        title: "Watch link revoked",
        detail: "",
      });
    }
    return null;
  },
});

export const listCards = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId: claimed }) => {
    const userId = await resolveUserId(ctx, claimed);
    const owned = await ctx.db
      .query("addressFiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const cards = [];
    for (const file of owned) {
      const [notices, records, claims] = await Promise.all([
        ctx.db.query("notices").withIndex("by_file", (q) => q.eq("fileId", file._id)).collect(),
        ctx.db.query("records").withIndex("by_file", (q) => q.eq("fileId", file._id)).collect(),
        ctx.db.query("claims").withIndex("by_file", (q) => q.eq("fileId", file._id)).collect(),
      ]);
      const promise = claims.find((c) => c.kind === "promise");
      cards.push({
        file,
        deadlineOn: notices[0]?.deadlineOn ?? null,
        noticeType: notices[0]?.noticeType ?? null,
        cityCount: records.filter((r) => r.kind === "violation").length,
        promiseDue: promise?.dueOn ?? null,
        promiseText: promise?.description ?? null,
      });
    }
    return cards;
  },
});

export const searchCards = query({
  args: { userId: v.optional(v.string()), searchQuery: v.string() },
  handler: async (ctx, { userId: claimed, searchQuery }) => {
    const userId = await resolveUserId(ctx, claimed);
    if (!searchQuery) {
      return [];
    }

    const owned = await ctx.db
      .query("addressFiles")
      .withSearchIndex("search_street", (q) =>
        q.search("street", searchQuery).eq("userId", userId)
      )
      .collect();

    const cards = [];
    for (const file of owned) {
      const [notices, records, claims] = await Promise.all([
        ctx.db.query("notices").withIndex("by_file", (q) => q.eq("fileId", file._id)).collect(),
        ctx.db.query("records").withIndex("by_file", (q) => q.eq("fileId", file._id)).collect(),
        ctx.db.query("claims").withIndex("by_file", (q) => q.eq("fileId", file._id)).collect(),
      ]);
      const promise = claims.find((c) => c.kind === "promise");
      cards.push({
        file,
        deadlineOn: notices[0]?.deadlineOn ?? null,
        noticeType: notices[0]?.noticeType ?? null,
        cityCount: records.filter((r) => r.kind === "violation").length,
        promiseDue: promise?.dueOn ?? null,
        promiseText: promise?.description ?? null,
      });
    }
    return cards;
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
    demoKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    const inbox = args.caseInbox || caseInbox(args.street, args.unit);
    const j = getJurisdiction(DEFAULT_JURISDICTION_ID);
    const fileId = await ctx.db.insert("addressFiles", {
      userId,
      street: args.street.trim(),
      unit: args.unit.trim(),
      city: args.city.trim() || "Chicago",
      state: args.state.trim() || "IL",
      zip: args.zip.trim(),
      jurisdiction: DEFAULT_JURISDICTION_ID,
      jurisdictionLabel: j.label,
      status: "opened",
      caseInbox: inbox,
      mailInboxId: args.mailInboxId,
      mailProvider: args.mailProvider || "mailto",
      demoKey: args.demoKey,
      watchKey: newWatchKey(),
    });
    if (args.tenantName.trim()) {
      await ctx.db.insert("parties", {
        fileId,
        userId,
        kind: "tenant",
        name: args.tenantName.trim(),
        email: args.tenantEmail ?? "",
        org: "",
      });
    }
    if (args.ownerName || args.ownerEmail) {
      await ctx.db.insert("parties", {
        fileId,
        userId,
        kind: "owner",
        name: args.ownerName || "Landlord",
        email: args.ownerEmail ?? "",
        org: args.ownerName || "",
      });
    }
    if (args.clinicEmail) {
      await ctx.db.insert("parties", {
        fileId,
        userId,
        kind: "clinic",
        name: "Legal aid",
        email: args.clinicEmail,
        org: "Legal aid",
      });
    }
    await ctx.db.insert("timelineEvents", {
      fileId,
      userId,
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
    source: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    const file = await requireFile(ctx, args.fileId, userId);
    const noticeId = await ctx.db.insert("notices", {
      fileId: args.fileId,
      userId: file.userId,
      noticeType: args.noticeType,
      servedOn: args.servedOn,
      deadlineOn: args.deadlineOn,
      plaintiff: args.plaintiff,
      amountCents: args.amountCents,
      reason: args.reason,
      rawText: args.rawText,
      source: args.source || "paste",
      storageId: args.storageId,
    });
    if (args.amountCents != null && Number.isFinite(args.amountCents)) {
      await ctx.db.insert("ledgerEntries", {
        fileId: args.fileId,
        userId: file.userId,
        kind: "notice",
        amountCents: Math.round(args.amountCents),
        note: `${args.noticeType.replaceAll("_", " ")} amount claimed`,
        occurredOn: args.servedOn || todayIso(),
        relatedNoticeId: noticeId,
      });
    }
    if (args.deadlineOn) {
      await ctx.db.insert("deadlines", {
        fileId: args.fileId,
        userId: file.userId,
        kind: "notice",
        title: "Respond to notice / cure or appear",
        dueOn: args.deadlineOn,
      });
      const parties = await ctx.db
        .query("parties")
        .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
        .collect();
      const tenant = parties.find((p) => p.kind === "tenant" && p.email?.trim());
      const toEmail = tenant?.email?.trim() ?? "";
      await scheduleForFile(ctx, {
        fileId: args.fileId,
        userId: file.userId,
        kind: "notice_deadline",
        dueOn: args.deadlineOn,
        toEmail,
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
    return noticeId;
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
    const userId = await resolveUserId(ctx, args.userId);
    const file = await requireFile(ctx, args.fileId, userId);
    await ctx.db.insert("timelineEvents", {
      fileId: args.fileId,
      userId: file.userId,
      kind: args.kind,
      title: args.title,
      detail: args.detail,
    });
  },
});

export const setStatus = mutation({
  args: {
    fileId: v.id("addressFiles"),
    userId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { fileId, userId: claimed, status }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    await ctx.db.patch(fileId, { status: nextStatus(file.status, status) });
  },
});

export const findDemo = query({
  args: { userId: v.string(), demoKey: v.string() },
  handler: async (ctx, { userId: claimed, demoKey }) => {
    const userId = await resolveUserId(ctx, claimed);
    return ctx.db
      .query("addressFiles")
      .withIndex("by_user_demo", (q) =>
        q.eq("userId", userId).eq("demoKey", demoKey),
      )
      .first();
  },
});

export { todayIso };
