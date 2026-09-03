import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { saveGuest } from "@/lib/open-address/folio-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
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
      if (!email.includes("@")) throw new Error("Enter a real email");
      saveGuest({ email, name: name || email.split("@")[0] });
      await navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  const onVercel = host.endsWith("vercel.app");

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
    <main className="min-h-screen bg-paper px-4 py-12 text-ink">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-xs uppercase tracking-widest text-stamp">
          Cook County
        </p>
        <h1 className="mt-2 font-serif text-4xl">Folio</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          One file for the notice on your door, the city’s records, and the
          letter you actually send.
        </p>
        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (onVercel) void continueGuest();
            else void submit("in");
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">
              Email
            </span>
            <input
              className="w-full min-h-11 rounded-sm border border-rule bg-panel px-3 text-sm"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </label>
          {!onVercel ? (
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-widest text-muted">
                Password
              </span>
              <input
                className="w-full min-h-11 rounded-sm border border-rule bg-panel px-3 text-sm"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">
              Name
            </span>
            <input
              className="w-full min-h-11 rounded-sm border border-rule bg-panel px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For a new account"
              autoComplete="name"
            />
          </label>
          {err ? <p className="text-sm text-stamp">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-11 rounded-sm bg-ink text-sm text-paper"
          >
            {busy ? "Working…" : onVercel ? "Continue" : "Sign in"}
          </button>
          {!onVercel ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("up")}
              className="w-full min-h-11 rounded-sm border border-ink text-sm"
            >
              Create account
            </button>
          ) : null}
        </form>
        <div className="mt-4 space-y-2">
          {authEnabled && !onVercel && host ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="w-full min-h-11 rounded-sm border border-rule bg-panel px-4 text-sm"
              >
                Continue with {p.label}
              </button>
            ))
          ) : onVercel ? (
            <p className="text-sm text-muted">
              Enter the email you’ll use for this file. No password on this
              link.
            </p>
          ) : !authEnabled ? (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          ) : null}
        </div>
        <p className="mt-8 text-xs text-muted">
          Not a lawyer. Does not file in court.
        </p>
      </div>
    </main>
  );
}
