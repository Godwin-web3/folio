import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

/**
 * Current Convex Auth user.
 * `userId` is `getUserIdentity().subject` (same value used by resolveUserId /
 * addressFiles.userId ownership).
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    const authUserId = await getAuthUserId(ctx);
    const user = authUserId ? await ctx.db.get(authUserId) : null;
    return {
      userId: identity.subject,
      name: user && typeof user.name === "string" ? user.name : "",
      email:
        (user && typeof user.email === "string" && user.email) ||
        (typeof identity.email === "string" ? identity.email : "") ||
        "",
    };
  },
});
