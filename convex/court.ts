import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireFile, resolveUserId } from "./authz";

export const setCourtCaseNumber = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    courtCaseNumber: v.string(),
  },
  handler: async (ctx, { userId: claimed, fileId, courtCaseNumber }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    const value = courtCaseNumber.trim().slice(0, 80);
    await ctx.db.patch(fileId, { courtCaseNumber: value || undefined });
    await ctx.db.insert("timelineEvents", {
      fileId,
      userId: file.userId,
      kind: "court",
      title: value
        ? `Court case number set: ${value}`
        : "Court case number cleared",
      detail: "",
    });
    return value || null;
  },
});
