"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  approveSendFn,
  assemblePacketFn,
  crawlBuildingFn,
  getAddressFile,
  ingestNoticeFn,
  logInboundFn,
  proposeDefenseFn,
} from "@/lib/open-address/api";
import {
  addressLabel,
  deadlineCopy,
  statusLabel,
  type FileStep,
} from "@/lib/open-address/flow";
import { copyText, mailtoHref } from "@/lib/open-address/mail-href";
import type { FileBundle, Message } from "@/lib/open-address/types";
import { AppHeader, DeadlineBar, Field, StepRail } from "@/components/app-shell";

export function FileWorkspace({
  fileId,
  step,
}: {
  fileId: string;
  step: FileStep;
}) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="min-h-screen bg-paper p-6 text-muted">Loading…</div>;
  }
  if (!user) {
    return (
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    );
  }
  return (
    <SignedIn>
      <FileShell fileId={fileId} step={step} />
    </SignedIn>
  );
}

function FileShell({ fileId, step }: { fileId: string; step: FileStep }) {
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<FileBundle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState("");
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    setBundle(await getAddressFile({ data: { fileId } }));
  }, [fileId]);

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
      setError(err instanceof Error ? err.message : "Action failed");
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

  const due =
    bundle.deadlines.find((d) => !d.completed_at)?.due_on ??
    bundle.notices[0]?.deadline_on ??
    null;
  const dueTitle =
    bundle.deadlines.find((d) => !d.completed_at)?.title ??
    (bundle.notices[0] ? statusLabel(bundle.notices[0].notice_type) : null);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader subtitle="File" title={addressLabel(bundle.file)} />
      <DeadlineBar copy={deadlineCopy(due)} detail={dueTitle} />
      <p className="border-b border-rule bg-panel px-4 py-2 text-xs text-muted">
        Case inbox {bundle.file.case_inbox}
        {bundle.file.mail_provider === "agentmail" ? " · AgentMail" : ""}
      </p>
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
                await ingestNoticeFn({
                  data: { fileId, rawText: noticeText },
                });
                setNoticeText("");
                await load();
              })
            }
            onCrawl={() =>
              void run("crawl", async () => {
                await crawlBuildingFn({ data: { fileId } });
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
                await proposeDefenseFn({ data: { fileId } });
                await load();
              })
            }
            onSend={(messageId) =>
              void run("send", async () => {
                const sent = await approveSendFn({ data: { messageId } });
                if (!bundle.file.mail_inbox_id) {
                  const href = mailtoHref(sent);
                  if (href) window.location.href = href;
                }
                await load();
              })
            }
            onInbound={() =>
              void run("inbound", async () => {
                await logInboundFn({ data: { fileId, body: replyText } });
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
                await assemblePacketFn({ data: { fileId } });
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
  const records = bundle.records;
  const ready = Boolean(notice) || bundle.records.length > 0;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-3xl">The notice and the building</h2>
        <p className="mt-2 text-sm text-muted">
          Paste what was on the door. Then pull the city’s file on this street.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-rule bg-panel p-4">
        <h3 className="text-xs uppercase tracking-widest text-muted">Notice</h3>
        <textarea
          className="min-h-36 w-full rounded-sm border border-rule bg-paper p-3 font-serif text-sm"
          value={noticeText}
          onChange={(e) => setNoticeText(e.target.value)}
          placeholder="Paste the notice, word for word."
          aria-label="Notice text"
        />
        <button
          type="button"
          disabled={busy !== null || noticeText.trim().length < 20}
          onClick={onIngest}
          className="w-full min-h-11 rounded-sm bg-ink text-sm text-paper disabled:opacity-40"
        >
          {busy === "notice" ? "Reading…" : "File this notice"}
        </button>
        {notice ? (
          <div className="border-t border-rule pt-3 text-sm">
            <p className="font-medium">{statusLabel(notice.notice_type)}</p>
            <p className="text-muted">
              Served {notice.served_on ?? "—"} · due {notice.deadline_on ?? "—"}
            </p>
            {notice.plaintiff ? (
              <p className="text-muted">{notice.plaintiff}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-rule bg-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs uppercase tracking-widest text-muted">
            City records
          </h3>
          <button
            type="button"
            disabled={busy !== null}
            onClick={onCrawl}
            className="min-h-11 rounded-sm border border-ink px-3 text-sm"
          >
            {busy === "crawl" ? "Pulling…" : "Pull this building"}
          </button>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-muted">
            Live Chicago violations plus Illinois self-help. If the city is
            slow, try again — you can still write the letter.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {records.map((r) => (
              <li key={r.id} className="border-t border-rule pt-2">
                <span className="text-xs uppercase tracking-wider text-filed">
                  {r.kind}
                </span>
                <div>{r.title}</div>
                <div className="text-xs text-muted">{r.agency}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        disabled={!ready}
        onClick={onNext}
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg min-h-12 bg-filed text-sm text-paper disabled:bg-rule sm:static sm:w-full sm:rounded-sm"
      >
        Continue to letters
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
  const pending = bundle.messages.filter((m) => m.status === "pending_approval");
  const sent = bundle.messages.some((m) => m.status === "sent");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-3xl">Write, then you send</h2>
        <p className="mt-2 text-sm text-muted">
          {bundle.file.mail_provider === "agentmail"
            ? "Approve sends from the case inbox. You still have to hit the button."
            : "Approve opens your mail app. Nothing leaves without you."}
        </p>
      </section>

      <button
        type="button"
        disabled={busy !== null}
        onClick={onDraft}
        className="w-full min-h-11 rounded-sm bg-ink text-sm text-paper"
      >
        {busy === "draft" ? "Drafting…" : "Draft letters"}
      </button>

      <ul className="space-y-3">
        {bundle.messages.map((m) => (
          <MailCard key={m.id} message={m} busy={busy} onSend={onSend} />
        ))}
      </ul>
      {pending.length > 0 ? (
        <p className="text-sm text-stamp">{pending.length} waiting on you.</p>
      ) : null}

      <section className="space-y-2 rounded-lg border border-rule bg-panel p-4">
        <h3 className="text-xs uppercase tracking-widest text-muted">
          File a reply
        </h3>
        <Field label="Paste what they sent">
          <textarea
            className="min-h-28 w-full rounded-sm border border-rule bg-paper p-3 text-sm"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            aria-label="Inbound reply"
          />
        </Field>
        <button
          type="button"
          disabled={busy !== null || replyText.trim().length < 8}
          onClick={onInbound}
          className="w-full min-h-11 rounded-sm border border-filed px-3 text-sm text-filed disabled:opacity-40"
        >
          {busy === "inbound" ? "Filing…" : "File this reply"}
        </button>
      </section>

      {bundle.claims.length > 0 ? (
        <section className="rounded-lg border border-rule bg-panel p-4 text-sm">
          <h3 className="text-xs uppercase tracking-widest text-muted">Ledger</h3>
          <ul className="mt-2 space-y-2">
            {bundle.claims.map((c) => (
              <li key={c.id}>
                <strong>{c.kind}</strong> · due {c.due_on ?? "—"}
                <div className="text-muted">{c.description}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button
        type="button"
        disabled={!sent && bundle.messages.length === 0}
        onClick={onNext}
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg min-h-12 bg-filed text-sm text-paper disabled:bg-rule sm:static sm:w-full sm:rounded-sm"
      >
        Continue to packet
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
    <li className="rounded-lg border border-rule bg-panel p-4 text-sm">
      <div className="text-xs uppercase tracking-wider text-muted">
        {statusLabel(m.status === "sent" ? "sent" : m.status)} ·{" "}
        {statusLabel(m.classification)}
      </div>
      <h3 className="mt-1 font-medium">{m.subject}</h3>
      {m.to_email ? (
        <p className="text-xs text-muted">To {m.to_email}</p>
      ) : (
        <p className="text-xs text-stamp">Add an email on the file so this can send.</p>
      )}
      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap font-sans text-xs text-muted">
        {m.body}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        {m.status === "pending_approval" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onSend(m.id)}
            className="min-h-11 rounded-sm bg-stamp px-3 text-paper"
          >
            {busy === "send" ? "Opening mail…" : "Approve and email"}
          </button>
        ) : null}
        {href ? (
          <a
            href={href}
            className="inline-flex min-h-11 items-center rounded-sm border border-rule px-3 text-xs"
          >
            Open in mail
          </a>
        ) : null}
        <button
          type="button"
          className="min-h-11 rounded-sm border border-rule px-3 text-xs"
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
        <h2 className="font-serif text-3xl">The packet</h2>
        <p className="mt-2 text-sm text-muted">
          Notice, city records, and any dated promise — labeled as exhibits.
        </p>
      </section>
      <button
        type="button"
        disabled={busy !== null}
        onClick={onPacket}
        className="w-full min-h-11 rounded-sm bg-ink text-sm text-paper"
      >
        {busy === "packet" ? "Binding…" : "Build packet"}
      </button>
      <ol className="space-y-2">
        {bundle.exhibits.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-rule bg-panel px-4 py-3"
          >
            <span className="font-serif text-lg">Exhibit {e.label}</span>
            <div className="text-sm">{e.title}</div>
          </li>
        ))}
      </ol>
      {bundle.exhibits.length > 0 ? (
        <Link
          to="/packet/$fileId"
          params={{ fileId: bundle.file.id }}
          className="flex min-h-12 items-center justify-center bg-filed text-sm text-paper sm:rounded-sm"
        >
          Print / save PDF
        </Link>
      ) : null}
      <p className="text-xs text-muted">
        Folio keeps a written record. It is not a lawyer and does not file
        in court for you.
      </p>
    </div>
  );
}
