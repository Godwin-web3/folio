import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireFile, resolveUserId } from "./authz";

/** Chicago RLTO / habitability prompts — not legal advice. */
const RLTO_SEED: {
  code: string;
  title: string;
  detail: string;
  source: string;
}[] = [
  {
    code: "rlto_improper_notice",
    title: "Improper notice timing or form (not legal advice)",
    detail:
      "Check whether the notice matches the claim type and required days under Illinois / RLTO. Folio does not decide validity.",
    source: "rlto",
  },
  {
    code: "rlto_retaliation",
    title: "Possible retaliation after complaint (not legal advice)",
    detail:
      "765 ILCS 720 — eviction soon after a code or rights complaint may be presumed retaliatory. Note dates of complaints vs notice.",
    source: "rlto",
  },
  {
    code: "hab_heat_water",
    title: "Essential services — heat / water / electricity",
    detail:
      "Document outages and landlord notice. Chicago code and RLTO treat essential services as habitability basics.",
    source: "habitability",
  },
  {
    code: "hab_open_violations",
    title: "Open city building violations on this address",
    detail:
      "City rows are building-level — confirm they match your unit before relying on them in a packet.",
    source: "habitability",
  },
  {
    code: "rlto_security_deposit",
    title: "Security deposit return timing (not legal advice)",
    detail:
      "RLTO has deposit accounting and return timing rules. Note move-out date and any itemized deductions received.",
    source: "rlto",
  },
  {
    code: "rlto_illegal_lockout",
    title: "Self-help lockout / utility shutoff (not legal advice)",
    detail:
      "Changing locks or cutting utilities to force a move-out without court process is generally unlawful. Document dates and photos.",
    source: "rlto",
  },
  {
    code: "rlto_rent_receipts",
    title: "Rent receipts and ledger match",
    detail:
      "Compare the notice amount to your rent ledger (charges vs payments). Flag mismatches before court or settlement talks.",
    source: "rlto",
  },
  {
    code: "hab_pest_mold",
    title: "Pest / mold / structural conditions reported in writing",
    detail:
      "Written repair requests and photos support habitability set-off or defense narratives. Keep dates.",
    source: "habitability",
  },
  {
    code: "rlto_entry",
    title: "Landlord entry without proper notice",
    detail:
      "RLTO generally requires notice before non-emergency entry. Log unexpected entries.",
    source: "rlto",
  },
  {
    code: "court_appearance",
    title: "Court date / appearance deadline on calendar",
    detail:
      "If a summons or case number exists, confirm the appearance date. Folio does not file or appear for you.",
    source: "custom",
  },
];

export const list = query({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    await requireFile(ctx, fileId, userId);
    return ctx.db
      .query("checklistItems")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
  },
});

export const seedRlto = mutation({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, { userId: claimed, fileId }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    const existing = await ctx.db
      .query("checklistItems")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const have = new Set(existing.map((r) => r.code));
    const inserted = [];
    for (const item of RLTO_SEED) {
      if (have.has(item.code)) continue;
      const id = await ctx.db.insert("checklistItems", {
        fileId,
        userId: file.userId,
        code: item.code,
        title: item.title,
        detail: item.detail,
        status: "open",
        source: item.source,
      });
      inserted.push(id);
    }
    if (inserted.length) {
      await ctx.db.insert("timelineEvents", {
        fileId,
        userId: file.userId,
        kind: "checklist",
        title: "Chicago RLTO checklist loaded",
        detail: `${inserted.length} items (not legal advice)`,
      });
    }
    return inserted.length;
  },
});

export const setStatus = mutation({
  args: {
    userId: v.string(),
    itemId: v.id("checklistItems"),
    status: v.string(),
  },
  handler: async (ctx, { userId: claimed, itemId, status }) => {
    const userId = await resolveUserId(ctx, claimed);
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Checklist item not found");
    await requireFile(ctx, item.fileId, userId);
    const next = status.trim().toLowerCase();
    if (!["open", "flagged", "cleared", "na"].includes(next)) {
      throw new Error("Invalid checklist status");
    }
    await ctx.db.patch(itemId, { status: next });
    return null;
  },
});
