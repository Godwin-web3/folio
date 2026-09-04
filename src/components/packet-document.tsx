"use client";

import type { FileBundle } from "@/lib/open-address/types";
import { formatDay, statusLabel } from "@/lib/open-address/flow";
import { qrSrc, watchHref } from "@/lib/open-address/watch-url";
import { COOK } from "@/lib/open-address/jurisdiction";

export function PacketDocument({ bundle }: { bundle: FileBundle }) {
  const { file } = bundle;
  const address = `${file.street}${file.unit ? `, Unit ${file.unit}` : ""}, ${file.city} ${file.state} ${file.zip}`;
  const notice = bundle.notices[0];
  const violations = bundle.records.filter((r) => r.kind === "violation");
  const promise = bundle.claims.find((c) => c.kind === "promise");
  const inbound = bundle.messages.find((m) => m.direction === "inbound");
  const watch = watchHref(file.watch_key);
  const assembled = new Date().toISOString().slice(0, 10);

  return (
    <article className="packet mx-auto max-w-2xl bg-panel px-6 py-8 text-ink print:max-w-none print:px-0 print:py-0">
      <header className="border-b-2 border-ink pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest">
          Circuit Court of Cook County · Housing · Folio packet
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">{address}</h1>
        <p className="mt-3 text-base font-semibold">
          Give this to legal aid. Do not ask the judge to look up a website.
        </p>
        <p className="mt-2 text-sm text-muted">
          Assembled {assembled}. Not a lawyer. Not a court form. Copies for
          tenant, legal aid, and the other side.
        </p>
      </header>

      {watch ? (
        <div className="mt-6 flex items-center gap-4 print:break-inside-avoid">
          <img
            src={qrSrc(watch)}
            alt="Live file QR"
            width={96}
            height={96}
            className="h-24 w-24 border border-rule bg-panel"
          />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Legal aid: watch this file live.</span>
            <br />
            Scan or open:
            <br />
            <span className="break-all text-xs">{watch}</span>
          </p>
        </div>
      ) : null}

      <section className="mt-10 print:break-before-page">
        <p className="font-serif text-sm font-semibold uppercase tracking-widest text-stamp">
          Exhibit A
        </p>
        <h2 className="font-serif text-3xl">Notice posted on the door</h2>
        {notice ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Type</dt>
              <dd className="font-semibold">{statusLabel(notice.notice_type)}</dd>
            </div>
            <div>
              <dt className="text-muted">Deadline</dt>
              <dd className="font-semibold">{formatDay(notice.deadline_on)}</dd>
            </div>
            <div>
              <dt className="text-muted">Served</dt>
              <dd>{formatDay(notice.served_on)}</dd>
            </div>
            <div>
              <dt className="text-muted">From</dt>
              <dd>{notice.plaintiff || "—"}</dd>
            </div>
            {notice.amount_cents ? (
              <div className="col-span-2">
                <dt className="text-muted">Amount claimed</dt>
                <dd className="font-serif text-2xl">
                  ${(notice.amount_cents / 100).toFixed(2)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm">No notice in this file yet.</p>
        )}
        {notice?.raw_text ? (
          <pre className="mt-4 whitespace-pre-wrap border border-rule bg-paper p-4 font-sans text-sm leading-relaxed">
            {notice.raw_text}
          </pre>
        ) : null}
      </section>

      <section className="mt-10 print:break-before-page">
        <p className="font-serif text-sm font-semibold uppercase tracking-widest text-stamp">
          Exhibit B
        </p>
        <h2 className="font-serif text-3xl">City of Chicago open violations</h2>
        <p className="mt-2 text-sm text-muted">
          Source: {COOK.buildingsUrl}
        </p>
        {violations.length === 0 ? (
          <p className="mt-3 text-sm">No open violations pulled yet.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="py-2 pr-2">#</th>
                <th className="py-2">Open condition</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((r, i) => (
                <tr key={r.id} className="border-b border-rule align-top">
                  <td className="py-2 pr-2 font-serif tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="py-2">
                    <span className="block font-medium">
                      {r.title.replace(/^OPEN · /i, "")}
                    </span>
                    {r.raw_excerpt ? (
                      <span className="block text-xs text-muted">{r.raw_excerpt}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-10 print:break-before-page">
        <p className="font-serif text-sm font-semibold uppercase tracking-widest text-stamp">
          Exhibit C
        </p>
        <h2 className="font-serif text-3xl">Dated promise</h2>
        {promise ? (
          <p className="mt-4 font-serif text-4xl leading-none text-stamp">
            {formatDay(promise.due_on ?? promise.promised_on)}
          </p>
        ) : (
          <p className="mt-3 text-sm">No dated promise in this file yet.</p>
        )}
        {inbound ? (
          <pre className="mt-4 whitespace-pre-wrap border border-rule bg-paper p-4 font-sans text-sm leading-relaxed">
            {inbound.from_email ? `From: ${inbound.from_email}\n\n` : ""}
            {inbound.body}
          </pre>
        ) : promise ? (
          <p className="mt-3 text-sm">{promise.description}</p>
        ) : null}
      </section>

      <footer className="mt-12 border-t border-ink pt-4 text-xs leading-relaxed text-muted">
        Folio is a written record. It does not represent the tenant and does not
        file in court. {COOK.court}.
      </footer>
    </article>
  );
}
