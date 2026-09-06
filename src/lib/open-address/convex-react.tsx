import { useState, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { CONVEX_URL } from "./convex-client";

/** Convex client + Convex Auth provider for the Folio product path. */
export function FolioConvex({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(CONVEX_URL));
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
