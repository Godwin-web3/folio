/**
 * Fail-closed auth helpers for Convex.
 *
 * Prefer Convex Auth identity (`ctx.auth.getUserIdentity()`). When identity is
 * present, client-supplied userId must match (or may be omitted). When identity
 * is absent (deployment without Convex Auth), we still require a non-empty
 * claimed userId and enforce ownership on every file access — but a client can
 * spoof that claim until Convex Auth (or a server-minted proof) is enabled.
 *
 * Watch links (`watchKey`) are share-by-link READ ONLY. Mutations never accept
 * watchKey; strangers with a link cannot write or mutate.
 */

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

type DbCtx = {
  db: {
    get: (id: any) => Promise<any>;
    query: (table: string) => any;
  };
};

/** Resolve the caller user id — identity wins over client claim. */
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
  const id = (claimedUserId ?? "").trim();
  if (!id || id.length > 320) {
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
