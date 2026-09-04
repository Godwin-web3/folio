"use client";

import { useQuery } from "convex/react";
import { api, mapBundle } from "@/lib/open-address/convex-client";
import { CaseFace } from "@/components/case-face";
import { PacketDocument } from "@/components/packet-document";
import { FolioMark } from "@/components/marks";

export function WatchFile({ watchKey }: { watchKey: string }) {
  const raw = useQuery(api.files.getByWatch, { watchKey });

  if (raw === undefined) {
    return <p className="min-h-screen bg-paper p-6 text-muted">Opening live file…</p>;
  }
  if (raw === null) {
    return <p className="min-h-screen bg-paper p-6 text-muted">This watch link is not valid.</p>;
  }

  const bundle = mapBundle(raw);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="print:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-rule bg-filed px-4 py-3 text-paper">
        <span className="flex items-center gap-2">
          <FolioMark className="text-paper" size={20} />
          <span>
            <p className="text-xs font-semibold uppercase tracking-widest">
              Legal aid · live
            </p>
            <p className="font-serif text-lg leading-none">
              {bundle.file.street}
              {bundle.file.unit ? ` ${bundle.file.unit}` : ""}
            </p>
          </span>
        </span>
        <button
          type="button"
          className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-filed"
          onClick={() => window.print()}
        >
          Print packet
        </button>
      </header>
      <div className="print:hidden">
        <CaseFace bundle={bundle} />
      </div>
      <div className="mt-6">
        <PacketDocument bundle={bundle} />
      </div>
    </div>
  );
}
