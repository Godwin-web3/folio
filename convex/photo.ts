import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { resolveUserId } from "./authz";
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
