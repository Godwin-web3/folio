import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { getJurisdiction } from "./lib/jurisdictions";

type ExportPack = {
  exportedAt: string;
  disclaimer: string;
  file: Record<string, unknown>;
  courtCaseNumber: string | null;
  jurisdiction: {
    id: string;
    label: string;
    court: string;
    fiveDay: string;
    openDataNote: string;
  };
  notices: unknown[];
  records: unknown[];
  claims: unknown[];
  ledger: unknown[];
  checklist: unknown[];
  exhibits: unknown[];
  deadlines: unknown[];
  timeline: unknown[];
  parties: unknown[];
};

export const build = action({
  args: { userId: v.string(), fileId: v.id("addressFiles") },
  handler: async (ctx, args): Promise<ExportPack> => {
    const bundle: any = await ctx.runQuery(api.files.get, args);
    const ledger: any[] = await ctx.runQuery(api.ledger.list, args);
    const checklist: any[] = await ctx.runQuery(api.checklist.list, args);
    const file = bundle.file as Record<string, unknown> & {
      jurisdiction: string;
      jurisdictionLabel?: string;
      courtCaseNumber?: string;
    };
    const j = getJurisdiction(file.jurisdiction);

    async function urlFor(storageId: string | undefined | null) {
      if (!storageId) return null;
      try {
        return await ctx.storage.getUrl(storageId as any);
      } catch {
        return null;
      }
    }

    const notices = [];
    for (const n of bundle.notices as any[]) {
      notices.push({
        ...n,
        noticePhotoUrl: await urlFor(n.storageId),
        proofPhotoUrl: await urlFor(n.servedPhotoStorageId),
      });
    }

    const exhibits = [];
    for (const e of bundle.exhibits as any[]) {
      exhibits.push({
        ...e,
        photoUrl: await urlFor(e.storageId),
      });
    }

    return {
      exportedAt: new Date().toISOString(),
      disclaimer:
        "Folio export pack — written record only. Not legal advice. Does not file in court.",
      file,
      courtCaseNumber: (file.courtCaseNumber as string | undefined) ?? null,
      jurisdiction: {
        id: file.jurisdiction,
        label: (file.jurisdictionLabel as string | undefined) ?? j.label,
        court: j.court,
        fiveDay: j.fiveDay,
        openDataNote: j.openDataNote,
      },
      notices,
      records: bundle.records,
      claims: bundle.claims,
      ledger,
      checklist,
      exhibits,
      deadlines: bundle.deadlines,
      timeline: bundle.events,
      parties: bundle.parties,
    };
  },
});
