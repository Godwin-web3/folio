import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { clearGuest, readGuest, type FolioGuest } from "./folio-user";

export type FolioSession = {
  userId: string;
  name: string;
  email: string;
  kind: "auth" | "guest";
};

export function useFolioSession(): {
  session: FolioSession | null;
  isPending: boolean;
  signOutGuest: () => void;
} {
  const { user, isPending: authPending } = useCurrentUserState();
  const [guest, setGuest] = useState<FolioGuest | null | undefined>(undefined);

  useEffect(() => {
    setGuest(readGuest());
  }, []);

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
    };
  }

  if (authPending || guest === undefined) {
    return { session: null, isPending: true, signOutGuest: () => undefined };
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
        window.location.href = "/login";
      },
    };
  }

  return { session: null, isPending: false, signOutGuest: () => undefined };
}
