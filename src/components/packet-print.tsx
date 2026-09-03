"use client";

import { useEffect, useState } from "react";
import { getFile } from "@/lib/open-address/data";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import type { FileBundle } from "@/lib/open-address/types";

export function PacketPrint({ fileId }: { fileId: string }) {
  const { session, isPending } = useFolioSession();
  const [bundle, setBundle] = useState<FileBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void getFile(session.userId, fileId)
      .then(setBundle)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load packet"),
      );
  }, [fileId, session]);

  if (isPending) return <p className="p-6 text-muted">Loading packet…</p>;
  if (!session) return <p className="p-6 text-muted">Sign in to print this packet.</p>;

  if (error) return <p className="p-6 text-stamp">{error}</p>;
  if (!bundle) return <p className="p-6 text-muted">Loading packet…</p>;

  const { file } = bundle;
  const address = `${file.street}${file.unit ? `, Unit ${file.unit}` : ""}, ${file.city} ${file.state} ${file.zip}`;

  return (
    <article className="mx-auto max-w-2xl p-6 print:p-0">
      <p className="text-xs uppercase tracking-[0.25em] text-stamp">
        Folio packet
      </p>
      <h1 className="mt-2 font-serif text-3xl">{address}</h1>
      <p className="mt-2 text-sm text-muted">
        Assembled {new Date().toISOString().slice(0, 10)}. Not legal advice. Do
        not file this as a court form unless a lawyer or self-help desk tells
        you to.
      </p>
      {bundle.exhibits.length === 0 ? (
        <p className="mt-6 text-sm">
          No exhibits yet. Assemble the packet from the file first.
        </p>
      ) : (
        bundle.exhibits.map((ex) => (
          <section key={ex.id} className="mt-8 border-t border-rule pt-4">
            <h2 className="font-serif text-2xl">
              Exhibit {ex.label} — {ex.title}
            </h2>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {ex.body}
            </pre>
          </section>
        ))
      )}
    </article>
  );
}
