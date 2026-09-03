"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, CalendarCheck, Clock3 } from "lucide-react";
import { FolioMark } from "@/components/marks";
import { useFolioSession } from "@/lib/open-address/use-folio-session";

export function Landing() {
  const { session, isPending } = useFolioSession();
  const inApp = Boolean(session) && !isPending;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-filed text-paper">
            <FolioMark className="text-paper" size={20} />
          </span>
          <span className="font-serif text-2xl leading-none">Folio</span>
        </Link>
        <Link
          to={inApp ? "/files" : "/login"}
          className="rounded-full bg-filed px-4 py-2.5 text-sm font-semibold text-paper"
        >
          {inApp ? "Your files" : "Open files"}
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-10 sm:pt-16">
          <p className="text-sm font-semibold tracking-wide text-filed">
            Cook County · City of Chicago
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl">
            If they name a day, that day is a claim.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            They taped five days to your door. Chicago may already have the
            building on a list. Folio puts those two facts in one file, then
            asks them to answer with a date.
          </p>
          <div className="mt-8 flex max-w-md flex-col gap-3">
            <Link
              to={inApp ? "/files" : "/login"}
              className="folio-btn"
            >
              {inApp ? "Go to your files" : "See it on a real building"}
            </Link>
            <p className="text-center text-sm text-muted">
              1757 W Berteau Ave is live city data. Not a mock.
            </p>
          </div>
        </section>

        <section className="mt-14 grid gap-3 sm:grid-cols-3">
          <Fact
            icon={<Clock3 className="h-5 w-5" strokeWidth={1.75} />}
            kicker="The clock"
            title="The notice has a due date."
            body="Five days is not a vibe. It sits on the file until it is late."
          />
          <Fact
            icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
            kicker="The city"
            title="Chicago already wrote it up."
            body="Open violations come from the city’s own list. Your opinion is not required."
          />
          <Fact
            icon={<CalendarCheck className="h-5 w-5" strokeWidth={1.75} />}
            kicker="The claim"
            title="“We’ll fix it Friday.”"
            body="The moment they name a day, Folio stamps it. That is the case."
          />
        </section>

        <section className="folio-card mt-14 overflow-hidden">
          <div className="bg-filed px-6 py-5 text-paper">
            <p className="text-xs font-semibold uppercase tracking-widest text-chip">
              On the file
            </p>
            <p className="mt-2 font-serif text-3xl leading-tight">
              They promised Friday. That’s a claim.
            </p>
            <p className="mt-2 text-sm text-chip">
              Chicago listed open problems on this building.
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-rule">
            <Stat label="Notice" value="5 days" />
            <Stat label="Chicago" value="Open" />
            <Stat label="Promise" value="Fri" hot />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-serif text-3xl">Three minutes. One apartment.</h2>
          <ol className="mt-6 space-y-4">
            <Step n="01" title="Open the street.">
              Berteau, Lincoln, Peoria — or yours. Folio starts a file, not a
              chat.
            </Step>
            <Step n="02" title="Pull Chicago.">
              Inspectors already failed this building. That list goes next to
              the notice.
            </Step>
            <Step n="03" title="Stamp the date they name.">
              Draft the letter. Send it. When they say Friday, tap the stamp.
              Print the packet for legal aid.
            </Step>
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="font-serif text-3xl">Real buildings. Live records.</h2>
          <ul className="mt-6 space-y-3">
            <Place
              street="1757 W Berteau Ave"
              side="North Side · 60613"
              note="The demo. Notice already on the file."
            />
            <Place
              street="5074 N Lincoln Ave"
              side="North Side · 60625"
              note="Open city problems, pulled live."
            />
            <Place
              street="7243 S Peoria St"
              side="South Side · 60621"
              note="Open city problems, pulled live."
            />
          </ul>
        </section>

        <section className="folio-card mt-16 px-6 py-8">
          <h2 className="font-serif text-3xl">What Folio is not</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Not a lawyer. Does not file in court. Does not talk to the judge.
            It is the paper trail so you are not empty-handed at the housing
            desk.
          </p>
          <Link
            to={inApp ? "/files" : "/login"}
            className="folio-btn mt-6"
          >
            {inApp ? "Open your files" : "Open Folio"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule px-5 py-8 text-center text-xs text-muted">
        Folio · Cook County first · Convex All Gas
      </footer>
    </div>
  );
}

function Fact({
  icon,
  kicker,
  title,
  body,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <article className="folio-card px-5 py-5">
      <div className="text-filed">{icon}</div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-filed">
        {kicker}
      </p>
      <h3 className="mt-2 font-serif text-2xl leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </article>
  );
}

function Stat({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div className="px-3 py-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-serif text-2xl leading-none ${hot ? "text-stamp" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="font-serif text-2xl text-filed">{n}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">
          {children}
        </span>
      </span>
    </li>
  );
}

function Place({
  street,
  side,
  note,
}: {
  street: string;
  side: string;
  note: string;
}) {
  return (
    <li className="folio-card flex flex-col px-5 py-4">
      <span className="font-semibold">{street}</span>
      <span className="text-sm text-muted">{side}</span>
      <span className="mt-1 text-sm text-muted">{note}</span>
    </li>
  );
}
