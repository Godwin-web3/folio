import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { nextStatus, todayIso } from "./lib";

export const replace = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    records: v.array(
      v.object({
        agency: v.string(),
        kind: v.string(),
        title: v.string(),
        url: v.string(),
        extracted: v.string(),
        rawExcerpt: v.string(),
      }),
    ),
  },
  handler: async (ctx, { userId, fileId, records }) => {
    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) throw new Error("File not found");
    const existing = await ctx.db
      .query("records")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);
    let openCount = 0;
    for (const rec of records) {
      await ctx.db.insert("records", {
        fileId,
        userId,
        agency: rec.agency,
        kind: rec.kind,
        title: rec.title,
        url: rec.url,
        extracted: rec.extracted,
        rawExcerpt: rec.rawExcerpt,
        status: "ready",
      });
      if (rec.kind === "violation" && rec.extracted.includes("OPEN")) openCount += 1;
    }
    if (openCount) {
      await ctx.db.insert("issues", {
        fileId,
        userId,
        kind: "habitability",
        title: "Open city building violations",
        detail: `${openCount} open`,
        status: "open",
        openedOn: todayIso(),
      });
    }
    await ctx.db.patch(fileId, {
      status: nextStatus(file.status, "building_pulled"),
    });
    await ctx.db.insert("timelineEvents", {
      fileId,
      userId,
      kind: "records",
      title: `Pulled ${records.length} records`,
      detail: `${openCount} open violations`,
    });
  },
});
