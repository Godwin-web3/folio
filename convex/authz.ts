/**
 * Fail-closed auth helpers for Convex.
 *
 * Prefer Convex Auth identity (`ctx.auth.getUserIdentity()`). When identity is
 * present, client-supplied userId must match (or may be omitted).
 *
 * Product path: require identity for file mutations and ownership-sensitive
 * queries (fail closed with Unauthorized). Watch-key reads stay unauthenticated
 * by design (`files.getByWatch`).
 *
 * Optional escape hatch: set Convex dashboard env `ALLOW_CLAIMED_USERID=true`
 * to accept a non-empty client-claimed userId when identity is absent (local
 * demos only). Default / absent = require identity.
 */

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

type DbCtx = {
  db: any;
};

/** Transitional local-demo escape hatch. Default OFF. */
export function allowClaimedUserId(
  env: { ALLOW_CLAIMED_USERID?: string } = process.env,
): boolean {
  const v = env.ALLOW_CLAIMED_USERID;
  return v === "1" || v === "true";
}

/** Normalize a client-claimed user id; null if empty/too long. */
export function normalizeClaimedUserId(
  claimedUserId: string | undefined,
): string | null {
  const id = (claimedUserId ?? "").trim();
  if (!id || id.length > 320) return null;
  return id;
}

/** Resolve the caller user id — identity wins; claim only if explicitly allowed. */
export async function resolveUserId(
  ctx: AuthCtx,
  claimedUserId: string | undefined,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.subject) {
    if (claimedUserId && claimedUserId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    return identity.subject;
  }
  if (!allowClaimedUserId()) {
    throw new Error("Unauthorized");
  }
  const id = normalizeClaimedUserId(claimedUserId);
  if (!id) {
    throw new Error("Unauthorized");
  }
  return id;
}

/** Load a file the user owns or is a member of; deny with "File not found". */
export async function requireFile(
  ctx: DbCtx,
  fileId: any,
  userId: string,
) {
  const file = await ctx.db.get(fileId);
  if (!file) throw new Error("File not found");
  if (file.userId === userId) return file;
  const members = await ctx.db
    .query("fileMembers")
    .withIndex("by_file", (q: any) => q.eq("fileId", fileId))
    .collect();
  if (!members.some((m: { userId: string }) => m.userId === userId)) {
    throw new Error("File not found");
  }
  return file;
}

/** Message must belong to a file the caller can access. */
export async function requireMessage(
  ctx: DbCtx,
  messageId: any,
  userId: string,
) {
  const msg = await ctx.db.get(messageId);
  if (!msg) throw new Error("Message not found");
  await requireFile(ctx, msg.fileId, userId);
  return msg;
}
