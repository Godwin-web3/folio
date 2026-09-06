"use client";

import { useQuery } from "convex/react";
import { api, mapBundle } from "@/lib/open-address/convex-client";
import { CaseFace } from "@/components/case-face";
import { PacketDocument } from "@/components/packet-document";
import { FolioMark } from "@/components/marks";

/**
 * Watch links are share-by-link READ ONLY for legal aid / clinic.
 * Mutations never accept watchKey — holders cannot ingest, send, or alter status.
 */
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
              Legal aid · live · read only
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
      <p className="print:hidden mx-4 mt-3 rounded-md border border-rule bg-white/70 px-3 py-2 text-xs text-muted">
        This watch link is share-by-link read access. It cannot change the file,
        send mail, or attach records. Ask the tenant to open Folio signed-in for
        writes.
      </p>
      <div className="print:hidden">
        <CaseFace bundle={bundle} />
      </div>
      <div className="mt-6">
        <PacketDocument bundle={bundle} />
      </div>
    </div>
  );
}
