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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-rule/80 bg-paper/90 px-4 py-3 backdrop-blur-md">
      <Link to="/" className="flex min-w-0 items-center gap-2.5 text-ink">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-filed text-paper">
          <FolioMark className="text-paper" size={20} />
        </span>
        <span className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted">
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
      <span className="grid h-9 w-9 place-items-center rounded-full bg-chip text-sm font-semibold">
        {session.name.charAt(0).toUpperCase()}
      </span>
      <button
        type="button"
        onClick={signOutGuest}
        className="text-xs font-medium text-muted"
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
    <nav aria-label="File" className="px-4 pb-1 pt-3">
      <div className="grid grid-cols-4 rounded-full bg-chip p-1 text-center text-sm font-medium">
        {tabs.map((t) => {
          const active = step === t.id;
          const cls = `min-h-10 rounded-full px-1 py-2 ${
            active ? "bg-panel text-ink shadow-sm" : "text-muted"
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
              <span key={t.id} className="min-h-10 px-1 py-2 text-rule">
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
      </div>
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
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
