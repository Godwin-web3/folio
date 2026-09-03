"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { FILE_STEPS, type FileStep } from "@/lib/open-address/flow";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import { FolioMark } from "@/components/marks";

export function AppHeader({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-rule bg-paper px-4 py-3">
      <Link to="/" className="flex min-w-0 items-center gap-2.5 text-ink">
        <FolioMark className="shrink-0 text-stamp" size={26} />
        <span className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stamp">
            {subtitle}
          </p>
          <h1 className="truncate font-serif text-[1.35rem] leading-none">{title}</h1>
        </span>
      </Link>
      <FolioAccount />
    </header>
  );
}

function FolioAccount() {
  const { session, signOutGuest } = useFolioSession();
  if (!session) return <UserButton />;
  if (session.kind === "auth") return <UserButton />;
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center border border-rule bg-panel font-serif text-sm">
        {session.name.charAt(0).toUpperCase()}
      </span>
      <button
        type="button"
        onClick={signOutGuest}
        className="text-xs text-muted underline-offset-4 hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}

export function StepRail({
  fileId,
  step,
}: {
  fileId?: string;
  step: FileStep | "open";
}) {
  const tabs: { id: FileStep | "open"; label: string; toHome?: boolean }[] = [
    { id: "open", label: "Files", toHome: true },
    ...FILE_STEPS.map((s) => ({ id: s.id, label: s.label })),
  ];
  return (
    <nav
      aria-label="File"
      className="grid grid-cols-4 border-b border-rule bg-paper text-center text-xs"
    >
      {tabs.map((t) => {
        const active = step === t.id;
        const cls = `min-h-11 px-1 py-3 tracking-wide ${
          active ? "border-b-2 border-ink font-medium text-ink" : "text-muted"
        }`;
        if (t.toHome) {
          return (
            <Link key={t.id} to="/" activeOptions={{ exact: true }} className={cls}>
              {t.label}
            </Link>
          );
        }
        if (!fileId) {
          return (
            <span key={t.id} className="min-h-11 px-1 py-3 text-rule">
              {t.label}
            </span>
          );
        }
        return (
          <Link
            key={t.id}
            to="/file/$fileId"
            params={{ fileId }}
            search={{ step: t.id as FileStep }}
            className={cls}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
