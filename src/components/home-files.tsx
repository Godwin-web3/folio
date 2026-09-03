"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import {
  listFiles,
  loadSample,
  openFile,
} from "@/lib/open-address/data";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import {
  addressLabel,
  recommendedStep,
  statusLabel,
} from "@/lib/open-address/flow";
import type { AddressFile } from "@/lib/open-address/types";
import { AppHeader, Field, StepRail } from "@/components/app-shell";

export function HomeFiles() {
  const { session, isPending } = useFolioSession();
  if (isPending) {
    return <div className="min-h-screen bg-paper p-6 text-muted">Loading…</div>;
  }
  if (!session) return <RedirectToSignIn />;
  return <HomeShell userId={session.userId} name={session.name} />;
}

function HomeShell({ userId, name }: { userId: string; name: string }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState<AddressFile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [zip, setZip] = useState("");
  const [tenantName, setTenantName] = useState(name);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");

  const refresh = useCallback(async () => {
    setFiles(await listFiles(userId));
  }, [userId]);

  useEffect(() => {
    void refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not load files"),
    );
  }, [refresh]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader subtitle="Cook County" title="Folio" />
      <StepRail step="open" />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <h2 className="font-serif text-2xl">Your apartment, one file</h2>
        {error ? (
          <p className="border border-stamp bg-panel px-3 py-2 text-sm text-stamp">
            {error}
          </p>
        ) : null}

        {files.length ? (
          <section>
            <h3 className="text-xs uppercase tracking-widest text-muted">
              Open files
            </h3>
            <ul className="mt-2 divide-y divide-rule border border-rule">
              {files.map((f) => (
                <li key={f.id}>
                  <Link
                    to="/file/$fileId"
                    params={{ fileId: f.id }}
                    search={{ step: recommendedStep(f.status) }}
                    className="flex min-h-14 items-center justify-between px-3 py-3"
                  >
                    <span className="font-medium">{addressLabel(f)}</span>
                    <span className="text-sm text-muted">
                      {statusLabel(f.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form
          className="space-y-3 rounded-lg border border-rule bg-panel p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run("create", async () => {
              const f = await openFile(userId, {
                street,
                unit,
                city: "Chicago",
                state: "IL",
                zip,
                tenantName,
                ownerName,
                ownerEmail,
                clinicEmail,
              });
              await navigate({
                to: "/file/$fileId",
                params: { fileId: f.id },
                search: { step: "notice" },
              });
            });
          }}
        >
          <h3 className="font-serif text-xl">Open a file</h3>
          <Field label="Street">
            <input
              required
              className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="1757 W Berteau Ave"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Unit">
              <input
                className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="2F"
              />
            </Field>
            <Field label="ZIP">
              <input
                className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="60613"
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Your name">
            <input
              className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            />
          </Field>
          <Field label="Landlord / LLC">
            <input
              className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Who is on the lease"
            />
          </Field>
          <Field label="Landlord email">
            <input
              type="email"
              className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="Where the demand should go"
            />
          </Field>
          <Field label="Legal aid email">
            <input
              type="email"
              className="w-full min-h-11 rounded-sm border border-rule bg-paper px-3 text-sm"
              value={clinicEmail}
              onChange={(e) => setClinicEmail(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <button
            type="submit"
            disabled={busy !== null}
            className="w-full min-h-11 rounded-sm bg-ink text-sm text-paper"
          >
            {busy === "create" ? "Opening…" : "Open my file"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void run("seed", async () => {
              const f = await loadSample(userId);
              await navigate({
                to: "/file/$fileId",
                params: { fileId: f.id },
                search: { step: "notice" },
              });
            })
          }
          className="text-sm text-muted underline"
        >
          {busy === "seed" ? "Loading sample…" : "Load a public Cook County sample"}
        </button>
        <p className="text-xs text-muted">
          Not a lawyer. Does not file in court. Cook County first.
        </p>
      </main>
    </div>
  );
}
