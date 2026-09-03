"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { api, mapFile } from "@/lib/open-address/convex-client";
import { openFile } from "@/lib/open-address/data";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import {
  addressLabel,
  daysUntil,
  formatDay,
  recommendedStepFromPulse,
  type CasePulse,
} from "@/lib/open-address/flow";
import type { AddressFile } from "@/lib/open-address/types";
import { AppHeader, Field } from "@/components/app-shell";
import { FolioMark } from "@/components/marks";

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
  const rawCards = useQuery(api.files.listCards, { userId });
  const openDemo = useAction(api.demo.openCase);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [zip, setZip] = useState("");
  const [tenantName, setTenantName] = useState(name);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const cards: { file: AddressFile; pulse: CasePulse }[] = (rawCards ?? []).map(
    (row) => {
      const file = mapFile(row.file);
      const days = daysUntil(row.deadlineOn);
      const pulse: CasePulse = {
        dueOn: row.deadlineOn,
        days,
        daysCopy:
          days == null
            ? null
            : days > 1
              ? `${days} days left`
              : days === 1
                ? "Due tomorrow"
                : days === 0
                  ? "Due today"
                  : `${Math.abs(days)} days late`,
        noticeLabel: row.noticeType,
        cityCount: row.cityCount,
        promise: row.promiseDue
          ? {
              id: "live",
              file_id: file.id,
              user_id: file.user_id,
              kind: "promise",
              amount_cents: null,
              description: row.promiseText ?? "",
              statute: "",
              status: "open",
              promised_on: row.promiseDue,
              due_on: row.promiseDue,
              created_at: "",
            }
          : null,
        headline: row.promiseDue
          ? `They promised ${formatDay(row.promiseDue)}. That’s a claim.`
          : row.cityCount
            ? `Chicago listed ${row.cityCount} open problems on this building.`
            : days != null
              ? `${Math.abs(days)} days ${days < 0 ? "late" : "on the notice"}.`
              : "File the notice. Then pull Chicago.",
        sub: "",
      };
      return { file, pulse };
    },
  );

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

  if (rawCards === undefined) {
    return <div className="min-h-screen bg-paper p-6 text-muted">Opening…</div>;
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
          <p className="folio-card mt-4 px-4 py-3 text-sm text-stamp">
            {error}
          </p>
        ) : null}

        {cards.length ? (
          <ul className="mt-8 space-y-3">
            {cards.map(({ file, pulse }) => (
              <li key={file.id}>
                <Link
                  to="/file/$fileId"
                  params={{ fileId: file.id }}
                  search={{ step: recommendedStepFromPulse(pulse) }}
                  className="folio-card flex min-h-20 items-stretch overflow-hidden"
                >
                  <span
                    className={`flex w-[4.5rem] shrink-0 flex-col items-center justify-center ${
                      pulse.days != null && pulse.days <= 2
                        ? "bg-stamp text-paper"
                        : "bg-filed text-paper"
                    }`}
                  >
                    <span className="font-serif text-3xl leading-none tabular-nums">
                      {pulse.days != null ? Math.abs(pulse.days) : "—"}
                    </span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider">
                      {pulse.days == null
                        ? "open"
                        : pulse.days < 0
                          ? "late"
                          : "left"}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                    <span className="truncate font-semibold">
                      {addressLabel(file)}
                    </span>
                    <span className="mt-0.5 truncate text-sm text-muted">
                      {pulse.headline}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="folio-card mt-8 px-5 py-6">
            <FolioMark className="text-filed" size={28} />
            <p className="mt-3 font-serif text-2xl">No file yet.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
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
                const id = await openDemo({ userId, sample: "berteau" });
                await navigate({
                  to: "/file/$fileId",
                  params: { fileId: id },
                  search: { step: "notice" },
                });
              })
            }
            className="folio-btn"
          >
            {busy === "seed" ? "Opening…" : "Open 1757 W Berteau — notice + Chicago"}
          </button>
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
            More real Chicago buildings
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void run("lincoln", async () => {
                const id = await openDemo({ userId, sample: "lincoln" });
                await navigate({
                  to: "/file/$fileId",
                  params: { fileId: id },
                  search: { step: "notice" },
                });
              })
            }
            className="folio-btn-ghost w-full"
          >
            {busy === "lincoln" ? "Pulling…" : "5074 N Lincoln Ave — North Side"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void run("peoria", async () => {
                const id = await openDemo({ userId, sample: "peoria" });
                await navigate({
                  to: "/file/$fileId",
                  params: { fileId: id },
                  search: { step: "notice" },
                });
              })
            }
            className="folio-btn-ghost w-full"
          >
            {busy === "peoria" ? "Pulling…" : "7243 S Peoria St — South Side"}
          </button>
          <button
            type="button"
            className="w-full py-2 text-sm font-medium text-muted"
            onClick={() => setOpenForm((v) => !v)}
          >
            {openForm ? "Hide the form" : "Start a file on my street"}
          </button>
        </div>

        {openForm ? (
          <form
            className="folio-card mt-6 space-y-3 p-4"
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
