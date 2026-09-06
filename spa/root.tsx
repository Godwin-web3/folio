import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";

function Shell() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const Route = createRootRoute({ component: Shell });
