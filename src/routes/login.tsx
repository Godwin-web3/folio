import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { FolioMark } from "@/components/marks";

export const Route = createFileRoute("/login")({ component: Login });

function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("invalidsecret") || lower.includes("invalid password")) {
    return "Wrong email or password.";
  }
  if (lower.includes("already exists") || lower.includes("account") && lower.includes("exist")) {
    return "That email already has an account — sign in instead.";
  }
  if (lower.includes("too short") || lower.includes("password")) {
    return raw;
  }
  // Strip noisy Convex action prefixes for tenants.
  const cleaned = raw.replace(/^\[CONVEX[^\]]*\]\s*/i, "").replace(/\s+Called by client.*$/i, "").trim();
  return cleaned || "Sign-in failed. Try again.";
}

/**
 * Login:
 * - Public Convex/Vercel hosts → Convex Auth Password (product identity).
 * - Other hosts → Better Auth email/password (+ OAuth when enabled).
 */
export function Login() {
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [host, setHost] = useState("");
  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  const onPublic =
    host.endsWith("vercel.app") || host.endsWith("convex.site");
  const useConvexPassword = onPublic;

  async function submitConvex(mode: "signIn" | "signUp") {
    setBusy(true);
    setErr(null);
    try {
      if (!email.includes("@")) throw new Error("Enter a valid email");
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      // Clear any stale token so a prior session cannot poison the next identity.
      try {
        await convexSignOut();
      } catch {
        /* ignore */
      }
      const params: Record<string, string> = {
        email: email.trim().toLowerCase(),
        password,
        flow: mode,
      };
      if (mode === "signUp") {
        params.name = name.trim() || email.split("@")[0] || "You";
      }
      const result = await convexSignIn("password", params);
      if (!result.signingIn) {
        throw new Error("Could not complete sign-in. Check email and password.");
      }
      // Full navigation so the SPA boots with a settled auth token (avoids
      // /files racing listCards before identity is attached).
      window.location.assign("/files");
    } catch (e) {
      setErr(friendlyAuthError(e));
      setBusy(false);
    }
  }

  async function submitBetterAuth(mode: "in" | "up") {
    setBusy(true);
    setErr(null);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      window.location.assign("/files");
    } catch (e) {
      setErr(friendlyAuthError(e));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-16 text-ink">
      <div className="mx-auto w-full max-w-sm">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-filed text-paper">
          <FolioMark className="text-paper" size={26} />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-wide text-filed">
          Cook County
        </p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Folio</h1>
        <p className="mt-4 text-lg leading-snug text-ink">
          The city’s file. Their date. Your clock.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          They posted a notice. Chicago may already have the building on a list.
          If they name a Friday, that Friday is a claim.
        </p>
        <form
          className="folio-card mt-8 space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (useConvexPassword) void submitConvex("signIn");
            else void submitBetterAuth("in");
          }}
        >
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Email
            </span>
            <input
              className="folio-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Password
            </span>
            <input
              className="folio-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Name
            </span>
            <input
              className="folio-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="For new accounts"
            />
          </label>
          {err ? <p className="text-sm text-stamp">{err}</p> : null}
          <button type="submit" disabled={busy} className="folio-btn">
            {busy ? "Opening…" : "Sign in"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void (useConvexPassword
                ? submitConvex("signUp")
                : submitBetterAuth("up"))
            }
            className="folio-btn-ghost w-full"
          >
            Create account
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {useConvexPassword ? (
            <p className="text-sm text-muted">
              Sign in required to open or change files. Share links (
              <span className="font-medium text-ink">/watch/…</span>) stay
              read-only without an account.
            </p>
          ) : authEnabled && host ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="folio-btn-ghost w-full"
              >
                Continue with {p.label}
              </button>
            ))
          ) : !authEnabled ? (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          ) : null}
        </div>
        <p className="mt-10 text-xs leading-relaxed text-muted">
          Not a lawyer. Does not file in court.
        </p>
      </div>
    </main>
  );
}
