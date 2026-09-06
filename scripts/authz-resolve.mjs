/**
 * Pure helpers mirroring convex/authz.ts claim-gate logic (for unit tests).
 * Keep in sync with resolveUserId / allowClaimedUserId there.
 */

/** Transitional local-demo escape hatch. Default OFF — require Convex identity. */
export function allowClaimedUserId(env = process.env) {
  const v = env.ALLOW_CLAIMED_USERID;
  return v === "1" || v === "true";
}

/** Normalize a client-claimed user id; null if empty/too long. */
export function normalizeClaimedUserId(claimed) {
  const id = String(claimed ?? "").trim();
  if (!id || id.length > 320) return null;
  return id;
}

/**
 * Resolve caller user id from identity subject + optional claim.
 * @param {{ subject?: string } | null | undefined} identity
 * @param {string | undefined} claimedUserId
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
export function resolveUserIdPure(identity, claimedUserId, env = process.env) {
  const subject = identity?.subject?.trim();
  if (subject) {
    if (claimedUserId && claimedUserId !== subject) {
      throw new Error("Unauthorized");
    }
    return subject;
  }
  if (!allowClaimedUserId(env)) {
    throw new Error("Unauthorized");
  }
  const id = normalizeClaimedUserId(claimedUserId);
  if (!id) throw new Error("Unauthorized");
  return id;
}
