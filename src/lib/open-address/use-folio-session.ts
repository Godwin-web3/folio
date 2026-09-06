import { useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { api } from "./convex-client";
import { clearGuest, readGuest, type FolioGuest } from "./folio-user";

export type FolioSession = {
  /** Matches Convex `getUserIdentity().subject` when kind is Convex Auth. */
  userId: string;
  name: string;
  email: string;
  /**
   * `convex` — signed in via Convex Auth (product path).
   * `auth` — Better Auth session (TanStack Start / non-Convex hosting).
   * `guest` — localStorage email; cannot mutate once identity is required.
   */
  kind: "convex" | "auth" | "guest";
};

export function useFolioSession(): {
  session: FolioSession | null;
  isPending: boolean;
  signOutGuest: () => void;
  signOut: () => Promise<void>;
} {
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const convexMe = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signOut: convexSignOut } = useAuthActions();
  const { user, isPending: authPending } = useCurrentUserState();
  const [guest, setGuest] = useState<FolioGuest | null | undefined>(undefined);

  useEffect(() => {
    setGuest(readGuest());
  }, []);

  const noopSignOut = async () => undefined;

  // Convex Auth is the source of truth for Convex-backed product identity.
  if (convexAuthLoading || (isAuthenticated && convexMe === undefined)) {
    return {
      session: null,
      isPending: true,
      signOutGuest: () => undefined,
      signOut: noopSignOut,
    };
  }

  if (isAuthenticated && convexMe) {
    return {
      session: {
        userId: convexMe.userId,
        name: convexMe.name || convexMe.email || "You",
        email: convexMe.email,
        kind: "convex",
      },
      isPending: false,
      signOutGuest: () => undefined,
      signOut: async () => {
        clearGuest();
        await convexSignOut();
        window.location.href = "/login";
      },
    };
  }

  if (user) {
    return {
      session: {
        userId: user.id,
        name: user.displayName ?? user.primaryEmail ?? "You",
        email: user.primaryEmail ?? "",
        kind: "auth",
      },
      isPending: false,
      signOutGuest: () => undefined,
      // Better Auth sign-out stays on UserButton / auth client for that stack.
      signOut: noopSignOut,
    };
  }

  if (authPending || guest === undefined) {
    return {
      session: null,
      isPending: true,
      signOutGuest: () => undefined,
      signOut: noopSignOut,
    };
  }

  if (guest) {
    return {
      session: {
        userId: guest.email,
        name: guest.name,
        email: guest.email,
        kind: "guest",
      },
      isPending: false,
      signOutGuest: () => {
        clearGuest();
        window.location.href = "/";
      },
      signOut: async () => {
        clearGuest();
        window.location.href = "/";
      },
    };
  }

  return {
    session: null,
    isPending: false,
    signOutGuest: () => undefined,
    signOut: noopSignOut,
  };
}
