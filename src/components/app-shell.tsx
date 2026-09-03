"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { FILE_STEPS, type FileStep } from "@/lib/open-address/flow";

export function AppHeader({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
      <Link to="/" className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-stamp">{subtitle}</p>
        <h1 className="truncate font-serif text-2xl leading-none">{title}</h1>
      </Link>
      <UserButton />
    </header>
  );
}

export function DeadlineBar({
  copy,
  detail,
}: {
  copy: string | null;
  detail?: string | null;
}) {
  if (!copy) return null;
  return (
    <div className="border-b border-stamp bg-panel px-4 py-2 text-sm text-stamp">
      <span className="font-medium">{copy}</span>
      {detail ? <span className="text-muted"> · {detail}</span> : null}
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
  return (
    <nav
      aria-label="File steps"
      className="grid grid-cols-4 border-b border-rule bg-panel text-center text-xs"
    >
      <Link
        to="/"
        activeOptions={{ exact: true }}
        className={`min-h-11 px-1 py-3 ${
          step === "open" ? "bg-ink text-paper" : "text-muted"
        }`}
      >
        <span className="block font-medium">1</span>
        Open
      </Link>
      {FILE_STEPS.map((s) => {
        const active = step === s.id;
        const disabled = !fileId;
        if (disabled) {
          return (
            <span key={s.id} className="min-h-11 px-1 py-3 text-rule">
              <span className="block font-medium">{s.n}</span>
              {s.label}
            </span>
          );
        }
        return (
          <Link
            key={s.id}
            to="/file/$fileId"
            params={{ fileId }}
            search={{ step: s.id }}
            className={`min-h-11 px-1 py-3 ${
              active ? "bg-ink text-paper" : "text-muted"
            }`}
          >
            <span className="block font-medium">{s.n}</span>
            {s.label}
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
      <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}
