import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { requireFile, resolveUserId } from "./authz";
import { parseNoticeFromImage, parseNoticeFromText } from "./lib/noticeParse";

export const generateUploadUrl = mutation({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId: claimed }) => {
    await resolveUserId(ctx, claimed);
    return ctx.storage.generateUploadUrl();
  },
});

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const parseNoticePhoto = action({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { userId, fileId, storageId }) => {
    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Photo did not upload");
    const mime = blob.type || "image/jpeg";
    const imageB64 = toBase64(await blob.arrayBuffer());
    const result = await parseNoticeFromImage(imageB64, mime);
    if (!result) {
      throw new Error(
        "Could not read the paper. Try a clearer photo, or type the notice instead. (Needs OPENAI_API_KEY in Convex.)",
      );
    }
    const { parsed, via } = result;
    await ctx.runMutation(api.files.ingestNotice, {
      userId,
      fileId,
      noticeType: parsed.noticeType,
      servedOn: parsed.servedOn ?? undefined,
      deadlineOn: parsed.deadlineOn ?? undefined,
      plaintiff: parsed.plaintiff,
      amountCents: parsed.amountCents ?? undefined,
      reason: parsed.reason,
      rawText: parsed.rawText,
      source: `photo:${via}`,
      storageId,
    });
    return { ...parsed, via };
  },
});

/** Type / paste path — OpenAI structures the notice; heuristic fallback if no key. */
export const parseNoticeText = action({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    rawText: v.string(),
  },
  handler: async (ctx, { userId, fileId, rawText }) => {
    const text = rawText.trim();
    if (text.length < 20) throw new Error("Paste more of the notice (at least a few lines).");
    const { parsed, via } = await parseNoticeFromText(text);
    await ctx.runMutation(api.files.ingestNotice, {
      userId,
      fileId,
      noticeType: parsed.noticeType,
      servedOn: parsed.servedOn ?? undefined,
      deadlineOn: parsed.deadlineOn ?? undefined,
      plaintiff: parsed.plaintiff,
      amountCents: parsed.amountCents ?? undefined,
      reason: parsed.reason,
      rawText: parsed.rawText,
      source: `typed:${via}`,
    });
    return { ...parsed, via };
  },
});

/**
 * Attach proof-of-service photo to the latest notice (or create served fields).
 * Timeline: "Proof of service filed".
 */
export const attachProofOfService = mutation({
  args: {
    userId: v.string(),
    fileId: v.id("addressFiles"),
    storageId: v.id("_storage"),
    servedMethod: v.optional(v.string()),
  },
  handler: async (ctx, { userId: claimed, fileId, storageId, servedMethod }) => {
    const userId = await resolveUserId(ctx, claimed);
    const file = await requireFile(ctx, fileId, userId);
    const notices = await ctx.db
      .query("notices")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const latest = notices.at(-1);
    const method = (servedMethod ?? "door_posting").trim() || "door_posting";
    const servedAt = Date.now();
    if (latest) {
      await ctx.db.patch(latest._id, {
        servedPhotoStorageId: storageId,
        servedAt,
        servedMethod: method,
      });
    } else {
      await ctx.db.insert("notices", {
        fileId,
        userId: file.userId,
        noticeType: "proof_of_service",
        plaintiff: "",
        reason: "Proof of service only",
        rawText: "",
        source: "proof",
        servedPhotoStorageId: storageId,
        servedAt,
        servedMethod: method,
      });
    }
    await ctx.db.insert("timelineEvents", {
      fileId,
      userId: file.userId,
      kind: "service",
      title: "Proof of service filed",
      detail: method,
    });
    return null;
  },
});
