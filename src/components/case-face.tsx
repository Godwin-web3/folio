"use client";

import type { ReactNode } from "react";
import type { FileBundle } from "@/lib/open-address/types";
import { casePulse, formatDay } from "@/lib/open-address/flow";
import { BuildingMark, ClockMark, StampMark } from "@/components/marks";

export function CaseFace({ bundle }: { bundle: FileBundle }) {
  const pulse = casePulse(bundle);
  return (
    <section className="px-4 pt-4">
      <div className="folio-card px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-filed">
          This file
        </p>
        <h2 className="mt-2 font-serif text-[1.9rem] leading-[1.15] text-ink">
          {pulse.headline}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{pulse.sub}</p>
        <ul className="mt-5 grid grid-cols-3 gap-2">
          <PulseCell
            icon={<ClockMark className="text-stamp" />}
            label="Notice"
            value={
              pulse.daysCopy ?? (bundle.notices[0] ? "On file" : "Not filed")
            }
            hot={pulse.days != null && pulse.days <= 2}
          />
          <PulseCell
            icon={<BuildingMark className="text-filed" />}
            label="Chicago"
            value={pulse.cityCount ? `${pulse.cityCount} open` : "Not pulled"}
            hot={pulse.cityCount > 0}
          />
          <PulseCell
            icon={<StampMark className="text-stamp" />}
            label="Promise"
            value={
              pulse.promise
                ? formatDay(pulse.promise.due_on ?? pulse.promise.promised_on)
                : "None"
            }
            hot={Boolean(pulse.promise)}
          />
        </ul>
      </div>
    </section>
  );
}

function PulseCell({
  icon,
  label,
  value,
  hot,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <li
      className={`rounded-2xl px-2.5 py-3 ${
        hot ? "bg-chip" : "bg-paper"
      }`}
    >
      <div className="flex items-center gap-1.5 text-muted">{icon}</div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-serif text-[1.15rem] leading-none ${
          hot ? "text-stamp" : "text-ink"
        }`}
      >
        {value}
      </p>
    </li>
  );
}
