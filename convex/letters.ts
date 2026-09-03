import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { COOK, nextStatus } from "./lib";

const LABELS = ["A", "B", "C", "D", "E", "F"];

export const insertDrafts = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    ownerEmail: v.string(),
    clinicEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    coverSubject: v.string(),
    coverBody: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== args.userId) throw new Error("File not found");
    const draftId = await ctx.db.insert("messages", {
      fileId: args.fileId,
      userId: file.userId,
      direction: "draft",
      toEmail: args.ownerEmail,
      fromEmail: file.caseInbox,
      subject: args.subject,
      body: args.body,
      classification: "demand",
      status: "pending_approval",
    });
    await ctx.db.insert("messages", {
      fileId: args.fileId,
      userId: file.userId,
      direction: "draft",
      toEmail: args.clinicEmail,
      fromEmail: "",
      subject: args.coverSubject,
      body: args.coverBody,
      classification: "other",
      status: "pending_approval",
    });
    await ctx.db.patch(args.fileId, {
      status: nextStatus(file.status, "demand_drafted"),
    });
    await ctx.db.insert("timelineEvents", {
      fileId: args.fileId,
      userId: file.userId,
      kind: "draft",
      title: "Demand and legal-aid cover awaiting approval",
      detail: "",
    });
    return draftId;
  },
});

export const propose = action({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const bundle = await ctx.runQuery(api.files.get, args);
    const file = bundle.file;
    const notice = bundle.notices[0];
    const owner =
      bundle.parties.find((p: { kind: string }) => p.kind === "owner")?.name ??
      "Landlord";
    const ownerEmail =
      bundle.parties.find((p: { kind: string; email: string }) => p.kind === "owner")
        ?.email ?? "";
    const clinicEmail =
      bundle.parties.find((p: { kind: string; email: string }) => p.kind === "clinic")
        ?.email ?? "";
    const tenant =
      bundle.parties.find((p: { kind: string }) => p.kind === "tenant")?.name ??
      "Tenant";
    const violations = bundle.records
      .filter((r: { kind: string }) => r.kind === "violation")
      .map((r: { title: string }) => r.title);
    const address = `${file.street}${file.unit ? `, Unit ${file.unit}` : ""}, ${file.city} ${file.state}`;
    const noticeLabel = (notice?.noticeType ?? "notice").replaceAll("_", " ");
    const subject = `Written demand — ${address} — confirm repairs in writing`;
    const body = [
      `To: ${owner}`,
      ``,
      `I am the tenant at ${address}. I received a ${noticeLabel} dated ${notice?.servedOn ?? "recently"}.`,
      ``,
      violations.length
        ? `The City of Chicago already lists these conditions on this building:\n${violations
            .slice(0, 5)
            .map((v: string) => `- ${v}`)
            .join("\n")}`
        : `Please confirm the current condition of heat, water, and structural repairs in writing.`,
      ``,
      `Please reply in writing with (1) any claim that rent is due and (2) a dated commitment to repair open conditions. An apology without a date is not a commitment.`,
      ``,
      `This is not legal advice and I am not represented. I am creating a written record.`,
      ``,
      tenant,
      file.caseInbox,
    ].join("\n");
    const coverBody = [
      `I need housing help for ${address}.`,
      notice
        ? `Notice: ${noticeLabel} served ${notice.servedOn}, deadline ${notice.deadlineOn}.`
        : `I have a landlord notice.`,
      `I pulled City of Chicago building records into my file and can share the packet.`,
      ``,
      tenant,
    ].join("\n");
    return ctx.runMutation(api.letters.insertDrafts, {
      userId: args.userId,
      fileId: args.fileId,
      ownerEmail,
      clinicEmail,
      subject,
      body,
      coverSubject: `Housing help — ${address}`,
      coverBody,
    });
  },
});

export const assemble = mutation({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId, fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) throw new Error("File not found");
    const existing = await ctx.db
      .query("exhibits")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);
    const notices = await ctx.db
      .query("notices")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const records = await ctx.db
      .query("records")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const pieces: { title: string; kind: string; table: string; id: string; body: string }[] =
      [];
    const n = notices[0];
    if (n) {
      pieces.push({
        title: `Notice — ${n.noticeType.replaceAll("_", " ")}`,
        kind: "notice",
        table: "notices",
        id: n._id,
        body: n.rawText,
      });
    }
    const viol = records.filter((r) => r.kind === "violation");
    if (viol[0]) {
      pieces.push({
        title: "City building violations",
        kind: "records",
        table: "records",
        id: viol[0]._id,
        body: viol.map((v) => `${v.title}\n${v.rawExcerpt}\n${v.url}`).join("\n\n"),
      });
    }
    const inbound = messages.find((m) => m.direction === "inbound");
    const promise = claims.find((c) => c.kind === "promise");
    if (inbound) {
      pieces.push({
        title: promise ? `Dated promise — due ${promise.dueOn}` : "Landlord reply",
        kind: "promise",
        table: "messages",
        id: inbound._id,
        body: inbound.body,
      });
    }
    const help = records.find((r) => r.kind === "self_help");
    if (help) {
      pieces.push({
        title: "Illinois self-help and statutory notes",
        kind: "law",
        table: "records",
        id: help._id,
        body: help.rawExcerpt || COOK.fiveDay,
      });
    }
    const exhibits = [];
    for (let i = 0; i < pieces.length; i += 1) {
      const p = pieces[i];
      const id = await ctx.db.insert("exhibits", {
        fileId,
        userId: file.userId,
        label: LABELS[i] ?? String(i + 1),
        title: p.title,
        kind: p.kind,
        sourceTable: p.table,
        sourceId: p.id,
        body: p.body,
      });
      exhibits.push(id);
    }
    await ctx.db.patch(fileId, { status: nextStatus(file.status, "packet_ready") });
    await ctx.db.insert("timelineEvents", {
      fileId,
      userId: file.userId,
      kind: "packet",
      title: `Packet assembled — ${exhibits.length} exhibits`,
      detail: "",
    });
    return exhibits;
  },
});
