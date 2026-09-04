import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

type ParsedNotice = {
  noticeType: string;
  servedOn: string | null;
  deadlineOn: string | null;
  plaintiff: string;
  amountCents: number | null;
  reason: string;
  rawText: string;
};

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function visionJson(imageB64: string): Promise<ParsedNotice | null> {
  const prompt =
    'This is a photo of a US landlord eviction / pay-or-quit notice on a door or in hand. Return JSON only with keys: noticeType (use 5_day_pay_or_quit if it is a five-day rent notice, else a short snake_case type), servedOn (YYYY-MM-DD or null), deadlineOn (YYYY-MM-DD or null), plaintiff (landlord name), amountCents (integer cents or null), reason, rawText (full transcription).';
  const openai = process.env.OPENAI_API_KEY;
  const xai = process.env.XAI_API_KEY;
  const attempts = [
    openai
      ? {
          url: "https://api.openai.com/v1/chat/completions",
          key: openai,
          model: "gpt-4o-mini",
        }
      : null,
    xai
      ? {
          url: "https://api.x.ai/v1/chat/completions",
          key: xai,
          model: "grok-2-vision-1212",
        }
      : null,
  ].filter(Boolean) as { url: string; key: string; model: string }[];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attempt.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          temperature: 0,
          max_tokens: 1200,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${imageB64}` },
                },
              ],
            },
          ],
        }),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) continue;
      const parsed = JSON.parse(content) as ParsedNotice;
      if (!parsed.rawText) continue;
      return {
        noticeType: parsed.noticeType || "5_day_pay_or_quit",
        servedOn: parsed.servedOn,
        deadlineOn: parsed.deadlineOn,
        plaintiff: parsed.plaintiff || "",
        amountCents: parsed.amountCents ?? null,
        reason: parsed.reason || "",
        rawText: parsed.rawText,
      };
    } catch {
      continue;
    }
  }
  return null;
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
    const imageB64 = toBase64(await blob.arrayBuffer());
    const parsed = await visionJson(imageB64);
    if (!parsed) {
      throw new Error(
        "Could not read the paper. Paste the notice, or add OPENAI_API_KEY in Convex.",
      );
    }
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
      source: "photo",
    });
    return parsed;
  },
});
