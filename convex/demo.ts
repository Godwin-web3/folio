import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { COOK } from "./lib";

export const openCase = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<Id<"addressFiles">> => {
    const existing = await ctx.runQuery(api.files.findDemo, {
      userId,
      demoKey: "cook-berteau-2f",
    });
    const fileId =
      existing?._id ??
      (await ctx.runAction(api.open.openFile, {
        userId,
        street: "1757 W Berteau Ave",
        unit: "2F",
        city: "Chicago",
        state: "IL",
        zip: "60613",
        tenantName: "Maya Chen",
        tenantEmail: "maya.chen@example.com",
        ownerName: "Northside Residential LLC",
        ownerEmail: "notices@northside-residential.example",
        clinicEmail: "housing@illinoislegalaid.org",
        demoKey: "cook-berteau-2f",
      }));
    const bundle = await ctx.runQuery(api.files.get, { userId, fileId });
    if (bundle.notices.length === 0) {
      await ctx.runMutation(api.files.ingestNotice, {
        userId,
        fileId,
        noticeType: "5_day_pay_or_quit",
        servedOn: "2026-09-01",
        deadlineOn: "2026-09-06",
        plaintiff: "Northside Residential LLC",
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
