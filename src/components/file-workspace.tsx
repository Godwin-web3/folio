"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import {
  buildPacket,
  draftLetters,
  getFile,
  ingestNotice,
  logReply,
  pullBuilding,
  sendLetter,
} from "@/lib/open-address/data";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import {
  addressLabel,
  formatDay,
  statusLabel,
  type FileStep,
} from "@/lib/open-address/flow";
import { copyText, mailtoHref } from "@/lib/open-address/mail-href";
import { COOK } from "@/lib/open-address/jurisdiction";
import type { FileBundle, Message } from "@/lib/open-address/types";
import { AppHeader, Field, StepRail } from "@/components/app-shell";
import { CaseFace } from "@/components/case-face";

export function FileWorkspace({
  fileId,
  step,
}: {
  fileId: string;
  step: FileStep;
}) {
  const { session, isPending } = useFolioSession();
  if (isPending) {
    return <div className="min-h-screen bg-paper p-6 text-muted">Opening file…</div>;
  }
  if (!session) return <RedirectToSignIn />;
  return <FileShell fileId={fileId} step={step} userId={session.userId} />;
}

function FileShell({
  fileId,
  step,
  userId,
}: {
  fileId: string;
  step: FileStep;
  userId: string;
}) {
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<FileBundle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState("");
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    setBundle(await getFile(userId, fileId));
  }, [fileId, userId]);

  useEffect(() => {
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not load file"),
    );
  }, [load]);

  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return;
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

  if (!bundle) {
    return (
      <div className="min-h-screen bg-paper">
        <AppHeader subtitle="Cook County" title="Folio" />
        <p className="p-6 text-muted">{error ?? "Opening file…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader subtitle="Cook County" title={addressLabel(bundle.file)} />
      <CaseFace bundle={bundle} />
      <StepRail fileId={fileId} step={step} />
      <main className="mx-auto max-w-lg px-4 py-6 pb-28">
        {error ? (
          <p className="mb-4 border border-stamp bg-panel px-3 py-2 text-sm text-stamp">
            {error}
          </p>
        ) : null}
        {step === "notice" ? (
          <NoticeScreen
            bundle={bundle}
            busy={busy}
            noticeText={noticeText}
            setNoticeText={setNoticeText}
            onIngest={() =>
              void run("notice", async () => {
                await ingestNotice(userId, fileId, noticeText);
                setNoticeText("");
                await load();
              })
            }
            onCrawl={() =>
              void run("crawl", async () => {
                await pullBuilding(userId, fileId);
                await load();
              })
            }
            onNext={() =>
              void navigate({
                to: "/file/$fileId",
                params: { fileId },
                search: { step: "letters" },
              })
            }
          />
        ) : null}
        {step === "letters" ? (
          <LettersScreen
            bundle={bundle}
            busy={busy}
            replyText={replyText}
            setReplyText={setReplyText}
            onDraft={() =>
              void run("draft", async () => {
                await draftLetters(userId, fileId);
                await load();
              })
            }
            onSend={(messageId) =>
              void run("send", async () => {
                const sent = await sendLetter(userId, messageId);
                if (!bundle.file.mail_inbox_id) {
                  const href = mailtoHref(sent);
                  if (href) window.location.href = href;
                }
                await load();
              })
            }
            onInbound={() =>
              void run("inbound", async () => {
                await logReply(userId, fileId, replyText);
                setReplyText("");
                await load();
              })
            }
            onNext={() =>
              void navigate({
                to: "/file/$fileId",
                params: { fileId },
                search: { step: "packet" },
              })
            }
          />
        ) : null}
        {step === "packet" ? (
          <PacketScreen
            bundle={bundle}
            busy={busy}
            onPacket={() =>
              void run("packet", async () => {
                await buildPacket(userId, fileId);
                await load();
              })
            }
          />
        ) : null}
      </main>
    </div>
  );
}

function NoticeScreen({
  bundle,
  busy,
  noticeText,
  setNoticeText,
  onIngest,
  onCrawl,
  onNext,
}: {
  bundle: FileBundle;
  busy: string | null;
  noticeText: string;
  setNoticeText: (v: string) => void;
  onIngest: () => void;
  onCrawl: () => void;
  onNext: () => void;
}) {
  const notice = bundle.notices[0];
  const violations = bundle.records.filter((r) => r.kind === "violation");
  const ready = Boolean(notice) && violations.length > 0;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-serif text-xl">What was on the door</h3>
        {notice ? (
          <div className="border border-ink bg-panel px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stamp">
              On file
            </p>
            <p className="mt-1 font-serif text-2xl leading-none">
              {statusLabel(notice.notice_type)}
            </p>
            <p className="mt-2 text-sm text-muted">
              Served {formatDay(notice.served_on)} · due{" "}
              {formatDay(notice.deadline_on)}
              {notice.plaintiff ? ` · ${notice.plaintiff}` : ""}
            </p>
          </div>
        ) : (
          <>
            <textarea
              className="folio-input min-h-40 font-serif"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="Paste the notice, word for word."
              aria-label="Notice text"
            />
            <button
              type="button"
              disabled={busy !== null || noticeText.trim().length < 20}
              onClick={onIngest}
              className="folio-btn"
            >
              {busy === "notice" ? "Filing…" : "File this notice"}
            </button>
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 className="font-serif text-xl">Chicago’s file on this building</h3>
          <button
            type="button"
            disabled={busy !== null}
            onClick={onCrawl}
            className="folio-btn-ghost shrink-0 text-sm"
          >
            {busy === "crawl" ? "Pulling…" : violations.length ? "Refresh" : "Pull Chicago"}
          </button>
        </div>
        {violations.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            Inspectors already write this building up. Folio puts that list next
            to your notice so the letter is not just your word.
          </p>
        ) : (
          <ol className="divide-y divide-rule border border-rule bg-panel">
            {violations.map((r, i) => (
              <li key={r.id} className="flex gap-3 px-3 py-3">
                <span className="w-6 shrink-0 font-serif text-lg tabular-nums text-stamp">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-sm leading-snug">{r.title.replace(/^OPEN · /i, "")}</span>
                  <span className="text-xs text-muted">Open · Chicago Buildings</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <button
        type="button"
        disabled={!ready}
        onClick={onNext}
        className="fixed inset-x-0 bottom-0 z-10 min-h-12 bg-filed text-sm text-paper disabled:bg-rule sm:static sm:w-full"
      >
        Write the letter
      </button>
    </div>
  );
}

function LettersScreen({
  bundle,
  busy,
  replyText,
  setReplyText,
  onDraft,
  onSend,
  onInbound,
  onNext,
}: {
  bundle: FileBundle;
  busy: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  onDraft: () => void;
  onSend: (id: string) => void;
  onInbound: () => void;
  onNext: () => void;
}) {
  const demand = bundle.messages.find((m) => m.classification === "demand");
  const promise = bundle.claims.find((c) => c.kind === "promise");
  const sent = bundle.messages.some((m) => m.status === "sent");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-serif text-xl">The letter</h3>
        <p className="text-sm leading-relaxed text-muted">
          It cites Chicago’s own list. It asks for a date in writing. Nothing
          leaves until you send it.
        </p>
        {!demand ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={onDraft}
            className="folio-btn"
          >
            {busy === "draft" ? "Writing…" : "Draft the letter"}
          </button>
        ) : null}
        <ul className="space-y-3">
          {bundle.messages.map((m) => (
            <MailCard key={m.id} message={m} busy={busy} onSend={onSend} />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl">If they name a day</h3>
        {promise ? (
          <div className="border border-stamp bg-panel px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-stamp">
              Claim
            </p>
            <p className="mt-1 font-serif text-3xl leading-none text-stamp">
              {formatDay(promise.due_on ?? promise.promised_on)}
            </p>
            <p className="mt-2 text-sm">{promise.description}</p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              “We’ll fix it Friday” is a claim the moment it is dated. Paste the
              reply.
            </p>
            <Field label="Their reply">
              <textarea
                className="folio-input min-h-28"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                aria-label="Inbound reply"
              />
            </Field>
            <button
              type="button"
              disabled={busy !== null || replyText.trim().length < 8}
              onClick={onInbound}
              className="folio-btn-ghost w-full"
            >
              {busy === "inbound" ? "Filing…" : "Stamp this as a claim"}
            </button>
          </>
        )}
      </section>

      <button
        type="button"
        disabled={!sent && !promise && bundle.messages.length === 0}
        onClick={onNext}
        className="fixed inset-x-0 bottom-0 z-10 min-h-12 bg-filed text-sm text-paper disabled:bg-rule sm:static sm:w-full"
      >
        Make the packet
      </button>
    </div>
  );
}

function MailCard({
  message: m,
  busy,
  onSend,
}: {
  message: Message;
  busy: string | null;
  onSend: (id: string) => void;
}) {
  const href = mailtoHref(m);
  return (
    <li className="border border-rule bg-panel p-4 text-sm">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">
        {m.status === "sent" ? "Sent" : m.status === "pending_approval" ? "Waiting on you" : statusLabel(m.status)}
        {m.classification === "demand" ? " · Demand" : ""}
      </div>
      <h4 className="mt-1 font-medium leading-snug">{m.subject}</h4>
      {m.to_email ? (
        <p className="text-xs text-muted">To {m.to_email}</p>
      ) : (
        <p className="text-xs text-stamp">Add a landlord email on the file so this can send.</p>
      )}
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted">
        {m.body}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        {m.status === "pending_approval" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onSend(m.id)}
            className="folio-btn-stamp"
          >
            {busy === "send" ? "Opening mail…" : "Send this"}
          </button>
        ) : null}
        {href ? (
          <a href={href} className="folio-btn-ghost text-xs">
            Open in mail
          </a>
        ) : null}
        <button
          type="button"
          className="folio-btn-ghost text-xs"
          onClick={() => void copyText(`${m.subject}\n\n${m.body}`)}
        >
          Copy
        </button>
      </div>
    </li>
  );
}

function PacketScreen({
  bundle,
  busy,
  onPacket,
}: {
  bundle: FileBundle;
  busy: string | null;
  onPacket: () => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-serif text-xl">What you can hand someone</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Notice, Chicago’s list, the letter, and any dated promise — labeled as
          exhibits. Not a court form.
        </p>
      </section>
      {bundle.exhibits.length === 0 ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={onPacket}
          className="folio-btn"
        >
          {busy === "packet" ? "Binding…" : "Build the packet"}
        </button>
      ) : (
        <ol className="divide-y divide-rule border border-rule bg-panel">
          {bundle.exhibits.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 px-4 py-3">
              <span className="font-serif text-xl text-stamp">{e.label}</span>
              <span className="text-sm">{e.title}</span>
            </li>
          ))}
        </ol>
      )}
      {bundle.exhibits.length > 0 ? (
        <Link
          to="/packet/$fileId"
          params={{ fileId: bundle.file.id }}
          className="flex min-h-12 items-center justify-center bg-filed text-sm text-paper"
        >
          Print / save PDF
        </Link>
      ) : null}
      <p className="text-xs leading-relaxed text-muted">
        Folio is a written record for {COOK.court}. It is not a lawyer and does
        not file in court.
      </p>
    </div>
  );
}
