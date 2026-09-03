import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { saveGuest } from "@/lib/open-address/folio-user";
import { FolioMark } from "@/components/marks";

export const Route = createFileRoute("/login")({ component: Login });

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [host, setHost] = useState("");
  useEffect(() => {
    setHost(window.location.hostname);
  }, []);
  async function continueGuest() {
    setBusy(true);
    setErr(null);
    try {
      if (!email.includes("@")) throw new Error("Enter the email you actually use");
      saveGuest({ email, name: name || email.split("@")[0] });
      await navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  const onPublic =
    host.endsWith("vercel.app") || host.endsWith("convex.site");

  async function submit(mode: "in" | "up") {
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
      await navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-14 text-ink">
      <div className="mx-auto w-full max-w-sm">
        <FolioMark className="text-stamp" size={36} />
        <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-stamp">
          Cook County
        </p>
        <h1 className="mt-1 font-serif text-5xl leading-none">Folio</h1>
        <p className="mt-4 text-[1.05rem] leading-snug text-ink">
          The city’s file. Their date. Your clock.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          They posted a notice. Chicago may already have the building on a list.
          If they name a Friday, that Friday is a claim.
        </p>
        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (onPublic) void continueGuest();
            else void submit("in");
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
          {!onPublic ? (
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
              />
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Name
            </span>
            <input
              className="folio-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          {err ? <p className="text-sm text-stamp">{err}</p> : null}
          <button type="submit" disabled={busy} className="folio-btn">
            {busy ? "Opening…" : onPublic ? "Open my files" : "Sign in"}
          </button>
          {!onPublic ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("up")}
              className="folio-btn-ghost w-full"
            >
              Create account
            </button>
          ) : null}
        </form>
        <div className="mt-4 space-y-2">
          {authEnabled && !onPublic && host
            ? GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                  className="folio-btn-ghost w-full"
                >
                  Continue with {p.label}
                </button>
              ))
            : onPublic
              ? (
                <p className="text-sm text-muted">
                  Use the email you’ll put on the letter. No password on this
                  link.
                </p>
                )
              : !authEnabled
                ? (
                  <p className="text-sm text-muted">Sign-in is disabled.</p>
                  )
                : null}
        </div>
        <p className="mt-10 text-xs leading-relaxed text-muted">
          Not a lawyer. Does not file in court.
        </p>
      </div>
    </main>
  );
}
