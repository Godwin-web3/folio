import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { COOK, SAMPLES } from "./lib";

export const openCase = action({
  args: {
    userId: v.string(),
    sample: v.optional(v.union(v.literal("berteau"), v.literal("lincoln"), v.literal("peoria"))),
  },
  handler: async (ctx, { userId, sample }): Promise<Id<"addressFiles">> => {
    const house = SAMPLES[sample ?? "berteau"];
    const existing = await ctx.runQuery(api.files.findDemo, {
      userId,
      demoKey: house.key,
    });
    const fileId =
      existing?._id ??
      (await ctx.runAction(api.open.openFile, {
        userId,
        street: house.street,
        unit: house.unit,
        city: "Chicago",
        state: "IL",
        zip: house.zip,
        tenantName: house.tenantName,
        tenantEmail: house.tenantEmail,
        ownerName: house.ownerName,
        ownerEmail: house.ownerEmail,
        clinicEmail: "housing@illinoislegalaid.org",
        demoKey: house.key,
      }));
    const bundle = await ctx.runQuery(api.files.get, { userId, fileId });
    if (house.withNotice && bundle.notices.length === 0) {
      await ctx.runMutation(api.files.ingestNotice, {
        userId,
        fileId,
        noticeType: "5_day_pay_or_quit",
        servedOn: "2026-09-01",
        deadlineOn: "2026-09-06",
        plaintiff: house.ownerName,
        amountCents: 184000,
        reason: "nonpayment of rent",
        rawText: COOK.demoNotice,
      });
    }
    if (!bundle.records.some((r: { kind: string }) => r.kind === "violation")) {
      await ctx.runAction(api.building.crawlBuilding, { userId, fileId });
    }
    return fileId;
  },
});
