import { useState, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CONVEX_URL } from "./convex-client";

export function FolioConvex({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(CONVEX_URL));
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
