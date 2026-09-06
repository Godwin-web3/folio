import { query } from "./_generated/server";
import { JURISDICTIONS, getJurisdiction } from "./lib/jurisdictions";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async () => JURISDICTIONS,
});

export const get = query({
  args: { id: v.string() },
  handler: async (_ctx, { id }) => getJurisdiction(id),
});
