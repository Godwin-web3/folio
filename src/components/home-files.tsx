"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getFile, listFiles, loadSample, openFile } from "@/lib/open-address/data";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import {
  addressLabel,
  casePulse,
  recommendedStepFromPulse,
  type CasePulse,
} from "@/lib/open-address/flow";
import type { AddressFile } from "@/lib/open-address/types";
import { AppHeader, Field } from "@/components/app-shell";
import { FolioMark } from "@/components/marks";

type Card = { file: AddressFile; pulse: CasePulse };

export function HomeFiles() {
  const { session, isPending } = useFolioSession();
  if (isPending) {
    return <div className="min-h-screen bg-paper p-6 text-muted">Opening…</div>;
  }
  if (!session) return <RedirectToSignIn />;
  return <HomeShell userId={session.userId} name={session.name} />;
}

function HomeShell({ userId, name }: { userId: string; name: string }) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [zip, setZip] = useState("");
  const [tenantName, setTenantName] = useState(name);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const refresh = useCallback(async () => {
    const files = await listFiles(userId);
    const next = await Promise.all(
      files.map(async (file) => {
        const bundle = await getFile(userId, file.id);
        return { file, pulse: casePulse(bundle) };
      }),
    );
    setCards(next);
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
      setError(err instanceof Error ? err.message : "That did not save");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader subtitle="Cook County" title="Folio" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-stamp">
          Cook County · City of Chicago
        </p>
        <h2 className="mt-2 font-serif text-[2rem] leading-[1.15]">
          The city’s file. Their date. Your clock.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The notice on the door, what Chicago already wrote about the building,
          and the day they named — in one file you can hand to legal aid.
        </p>

        {error ? (
          <p className="mt-4 border border-stamp bg-panel px-3 py-2 text-sm text-stamp">
            {error}
          </p>
        ) : null}

        {cards.length ? (
          <ul className="mt-8 divide-y divide-rule border border-rule bg-panel">
            {cards.map(({ file, pulse }) => (
              <li key={file.id}>
                <Link
                  to="/file/$fileId"
                  params={{ fileId: file.id }}
                  search={{ step: recommendedStepFromPulse(pulse) }}
                  className="flex min-h-16 items-stretch gap-3"
                >
                  <span
                    className={`flex w-16 shrink-0 flex-col items-center justify-center ${
                      pulse.days != null && pulse.days <= 2
                        ? "bg-stamp text-paper"
                        : "bg-chip text-ink"
                    }`}
                  >
                    <span className="font-serif text-2xl leading-none tabular-nums">
                      {pulse.days != null ? Math.abs(pulse.days) : "—"}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider">
                      {pulse.days == null
                        ? "days"
                        : pulse.days < 0
                          ? "late"
                          : "left"}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
                    <span className="truncate font-medium">
                      {addressLabel(file)}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {pulse.headline}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 border border-rule bg-panel px-4 py-5">
            <FolioMark className="text-stamp" size={28} />
            <p className="mt-3 font-serif text-xl">No file yet.</p>
            <p className="mt-1 text-sm text-muted">
              Start with the street. Or open a real Chicago building and see how
              the city already listed it.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-3">
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
            className="folio-btn"
          >
            {busy === "seed" ? "Opening…" : "Open 1757 W Berteau — a real building"}
          </button>
          <button
            type="button"
            className="folio-btn-ghost w-full"
            onClick={() => setOpenForm((v) => !v)}
          >
            {openForm ? "Hide the form" : "Start a file on my street"}
          </button>
        </div>

        {openForm ? (
          <form
            className="mt-6 space-y-3 border border-rule bg-panel p-4"
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
                });
                await navigate({
                  to: "/file/$fileId",
                  params: { fileId: f.id },
                  search: { step: "notice" },
                });
              });
            }}
          >
            <Field label="Street">
              <input
                required
                className="folio-input"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="1757 W Berteau Ave"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unit">
                <input
                  className="folio-input"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="2F"
                />
              </Field>
              <Field label="ZIP">
                <input
                  className="folio-input"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="60613"
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Field label="Your name">
              <input
                className="folio-input"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </Field>
            <Field label="Landlord / LLC">
              <input
                className="folio-input"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </Field>
            <Field label="Landlord email">
              <input
                type="email"
                className="folio-input"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </Field>
            <button
              type="submit"
              disabled={busy !== null}
              className="folio-btn"
            >
              {busy === "create" ? "Opening…" : "Open this file"}
            </button>
          </form>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-muted">
          Not a lawyer. Does not file in court. Cook County first.
        </p>
      </main>
    </div>
  );
}
