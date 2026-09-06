"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Camera,
  Clock3,
  FileStack,
  MapPin,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { FolioMark } from "@/components/marks";
import { useFolioSession } from "@/lib/open-address/use-folio-session";

export function Landing() {
  const { session, isPending } = useFolioSession();
  const inApp = Boolean(session) && !isPending;
  const ctaTo = inApp ? "/files" : "/login";
  const ctaPrimary = inApp ? "Go to your files" : "Open a file on a real building";
  const ctaSecondary = inApp ? "Your files" : "Open files";

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
          to={ctaTo}
          className="rounded-full bg-filed px-4 py-2.5 text-sm font-semibold text-paper"
        >
          {ctaSecondary}
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        {/* 1. Hero — problem-first cold open */}
        <section className="pt-10 sm:pt-14">
          <p className="text-sm font-semibold tracking-wide text-filed">
            Housing file · Cook County first
          </p>
          <h1 className="mt-4 font-serif text-[2.65rem] leading-[1.05] sm:text-5xl">
            They taped five days to your door.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            The notice is on the glass. Your phone is full of screenshots.
            Legal aid wants one file, not a camera roll. Chicago may already
            have the building on a list — and you have five days under Illinois
            law before the clock runs out.
          </p>
          <p className="mt-6 max-w-xl font-serif text-2xl leading-snug text-ink sm:text-3xl">
            If they name a day, that day is a claim.
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            Folio is the living file for that apartment: notice, city records,
            rent ledger, dated promise, and the packet you hand across the desk.
          </p>
          <div className="mt-8 flex max-w-md flex-col gap-3">
            <Link to={ctaTo} className="folio-btn">
              {ctaPrimary}
            </Link>
            <p className="text-center text-sm text-muted">
              1757 W Berteau Ave is live city data. Not a mock.
            </p>
          </div>
        </section>

        {/* 2. The problem */}
        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-filed">
            The problem
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            Panic looks like a folder that does not exist.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
            <p>
              You photograph the five-day notice. Then the texts. Then the
              broken heat. Then the money order stub. Each one lands in a
              different album, a different thread, a different night you could
              not sleep.
            </p>
            <p>
              When the landlord says “we’ll fix it Friday,” that promise dies in
              the camera roll. When legal aid asks for one packet, you have
              fifty screenshots and no ledger. The judge will not scroll your
              phone.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            <ProblemCard
              icon={<Camera className="h-5 w-5" strokeWidth={1.75} />}
              title="Scattered proof"
              body="Notices, texts, and receipts live in separate places until someone needs them all at once."
            />
            <ProblemCard
              icon={<FileStack className="h-5 w-5" strokeWidth={1.75} />}
              title="No ledger"
              body="Who paid what, when — missing until intake asks. Then you rebuild it under a deadline."
            />
            <ProblemCard
              icon={<ShieldAlert className="h-5 w-5" strokeWidth={1.75} />}
              title="Promises vanish"
              body="A named date is a claim. Without a stamp and a file, it is just another message."
            />
          </ul>
        </section>

        {/* 3. Real-world data */}
        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-filed">
            Real-world data
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            A national crisis. A live wedge in Cook County.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Folio starts where the paper trail and open data already collide —
            Chicago and Cook — so the same file shape can expand city by city.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <StatCard
              value="~3.6M"
              label="U.S. eviction filings / year"
              source="Eviction Lab"
              note="Typical annual volume nationwide."
            />
            <StatCard
              value="~12k"
              label="Cook County eviction orders, 2023"
              source="Cook County Sheriff"
              note="About 11,988 orders executed that year."
            />
            <StatCard
              value="40k+"
              label="Cook filings since Apr 2022"
              source="Cook County courts"
              note="Post-moratorium filings in the county."
            />
            <StatCard
              value="~1.16M"
              label="Open Chicago building violations"
              source="Chicago SODA"
              note="Live open-data rows — not a private scrape."
            />
          </div>
          <article className="folio-card mt-3 overflow-hidden">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <span className="mt-0.5 text-filed">
                  <Clock3 className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-filed">
                    The clock
                  </p>
                  <p className="mt-1 font-serif text-2xl leading-snug">
                    Illinois five-day pay-or-quit
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    735 ILCS 5/9-209. Five days after service is not a vibe —
                    it is the window before the next step can start.
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted sm:text-right">
                Statute
              </p>
            </div>
          </article>
        </section>

        {/* 4. The solution */}
        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-filed">
            The solution
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            One living file for the apartment.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Folio holds the notice, Chicago’s own building pull, the rent
            ledger, RLTO / habitability checklist, demand letter, dated claim,
            watch link, exhibits, and export pack — so you are not empty-handed
            at the housing desk.
          </p>

          <div className="folio-card mt-8 overflow-hidden">
            <div className="bg-filed px-6 py-5 text-paper">
              <p className="text-xs font-semibold uppercase tracking-widest text-chip">
                On the file
              </p>
              <p className="mt-2 font-serif text-3xl leading-tight">
                They promised Friday. That’s a claim.
              </p>
              <p className="mt-2 text-sm text-chip">
                Notice · Chicago open problems · ledger · the day they named.
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-rule">
              <MiniStat label="Notice" value="5 days" />
              <MiniStat label="Chicago" value="Open" />
              <MiniStat label="Promise" value="Fri" hot />
            </div>
          </div>

          <ol className="mt-10 space-y-5">
            <Step n="01" title="Type or Snap the notice">
              Photograph the paper on the door, or type it in. Folio structures
              the deadline, landlord, and amount. Add a proof-of-service photo
              when you have it.
            </Step>
            <Step n="02" title="Pull Chicago + keep the ledger">
              Open building violations land next to the notice — with unit vs.
              building honesty. Track rent paid and owed. Work the RLTO /
              habitability checklist. Draft the demand that asks for a date in
              writing.
            </Step>
            <Step n="03" title="Stamp the claim. Share the watch.">
              When they name a day, Folio flashes it on the file. Send a watch
              link legal aid can open live (revoke anytime). Build packet
              exhibits, export the pack, add a court case number, set email
              reminders.
            </Step>
          </ol>
        </section>

        {/* 5. Why Cook / Chicago first */}
        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-filed">
            Why Cook first
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            Start where open data meets the five-day clock.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
            <p>
              Cook County and the City of Chicago already publish building
              violations at scale. Illinois names the five-day pay-or-quit in
              statute. That is enough to ship a real file — not a pitch deck —
              and prove the shape works before the next city.
            </p>
            <p>
              Folio is not a one-city product. Cook is the live wedge. The same
              apartment file expands later; New York City is already stubbed in
              the jurisdiction pack for the next cut.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <article className="folio-card px-5 py-5">
              <div className="text-filed">
                <MapPin className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-filed">
                Live now
              </p>
              <h3 className="mt-2 font-serif text-2xl leading-snug">
                Cook County · Chicago
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                SODA building pull, Illinois five-day framing, RLTO checklist,
                demo addresses with live records.
              </p>
            </article>
            <article className="folio-card px-5 py-5">
              <div className="text-filed">
                <Building2 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-filed">
                Next cities
              </p>
              <h3 className="mt-2 font-serif text-2xl leading-snug">
                NYC stub · same file shape
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Jurisdiction pack is ready to grow. New open-data sources plug
                into the same notice → city → claim path.
              </p>
            </article>
          </div>
        </section>

        {/* 6. Demo buildings */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl">Real buildings. Live records.</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Open one. Pull Chicago. See what the city already wrote down.
          </p>
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

        {/* 7. Disclaimer + final CTA */}
        <section className="folio-card mt-16 px-6 py-8">
          <div className="flex gap-3">
            <Scale className="mt-1 h-5 w-5 shrink-0 text-filed" strokeWidth={1.75} />
            <div>
              <h2 className="font-serif text-3xl">What Folio is not</h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Not a lawyer. Does not file in court. Does not talk to the
                judge. It is the paper trail — notice, city list, ledger, dated
                promise, exhibits — so you are not empty-handed at the housing
                desk.
              </p>
            </div>
          </div>
          <Link to={ctaTo} className="folio-btn mt-6">
            {inApp ? "Open your files" : "Start with a real Chicago building"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule px-5 py-8 text-center text-xs text-muted">
        Folio · Cook County first · Convex All Gas
      </footer>
    </div>
  );
}

function ProblemCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="folio-card px-5 py-5">
      <div className="text-filed">{icon}</div>
      <h3 className="mt-4 font-serif text-xl leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </article>
  );
}

function StatCard({
  value,
  label,
  source,
  note,
}: {
  value: string;
  label: string;
  source: string;
  note: string;
}) {
  return (
    <article className="folio-card px-5 py-5">
      <p className="font-serif text-4xl leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-3 text-sm font-semibold leading-snug text-ink">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{note}</p>
      <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-widest text-filed">
        {source}
      </p>
    </article>
  );
}

function MiniStat({
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
