"use client";

import { useQuery } from "convex/react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { api, asFileId, mapBundle } from "@/lib/open-address/convex-client";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import { PacketDocument } from "@/components/packet-document";

export function PacketPrint({ fileId }: { fileId: string }) {
  const { session, isPending } = useFolioSession();
  const raw = useQuery(
    api.files.get,
    session ? { userId: session.userId, fileId: asFileId(fileId) } : "skip",
  );

  if (isPending) return <p className="p-6 text-muted">Loading packet…</p>;
  if (!session) return <RedirectToSignIn />;
  if (raw === undefined) return <p className="p-6 text-muted">Loading packet…</p>;

  return <PacketDocument bundle={mapBundle(raw)} />;
}
