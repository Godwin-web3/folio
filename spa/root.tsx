import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { FolioConvex } from "@/lib/open-address/convex-react";

function Shell() {
  return (
    <FolioConvex>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </FolioConvex>
  );
}

export const Route = createRootRoute({ component: Shell });
