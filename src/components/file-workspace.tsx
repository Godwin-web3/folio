"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { api, asFileId, asMessageId, asStorageId, mapBundle } from "@/lib/open-address/convex-client";
import { logReply } from "@/lib/open-address/data";
import { compressNoticePhoto } from "@/lib/open-address/compress-image";
import { watchHref } from "@/lib/open-address/watch-url";
import { useFolioSession } from "@/lib/open-address/use-folio-session";
import {
  addressLabel,
  deadlineCopy,
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
  const raw = useQuery(api.files.get, {
    userId,
    fileId: asFileId(fileId),
  });
  const crawl = useAction(api.building.crawlBuilding);
  const draft = useAction(api.letters.propose);
  const send = useAction(api.mail.approveSend);
  const pack = useMutation(api.letters.assemble);
  const friday = useAction(api.mail.stampFriday);
  const uploadUrl = useMutation(api.photo.generateUploadUrl);
  const parsePhoto = useAction(api.photo.parseNoticePhoto);
  const parseText = useAction(api.photo.parseNoticeText);
  const ensureWatch = useMutation(api.files.ensureWatchKey);
  const revokeWatch = useMutation(api.files.revokeWatchKey);
  const attachProof = useMutation(api.photo.attachProofOfService);
  const addLedger = useMutation(api.ledger.addEntry);
  const seedChecklist = useMutation(api.checklist.seedRlto);
  const setChecklistStatus = useMutation(api.checklist.setStatus);
  const setCourtCase = useMutation(api.court.setCourtCaseNumber);
  const exportPack = useAction(api.exportPack.build);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [flashClaimId, setFlashClaimId] = useState<string | null>(null);
  const prevClaimIdsRef = useRef<Set<string>>(new Set());

  const bundle = raw ? mapBundle(raw) : null;

  const claimIdsKey = bundle
    ? bundle.claims.map((c) => `${c.id}:${c.kind}`).join("|")
    : "";

  useEffect(() => {
    if (!bundle) return;
    const ids = bundle.claims.map((c) => c.id);
    const prev = prevClaimIdsRef.current;
    const grew = ids.some((id) => !prev.has(id));
    let timer: number | undefined;
    if (prev.size > 0 && grew) {
      const newestPromise = [...bundle.claims]
        .filter((c) => c.kind === "promise" && !prev.has(c.id))
        .at(-1);
      const flashId =
        newestPromise?.id ??
        [...ids].reverse().find((id) => !prev.has(id)) ??
        null;
      if (flashId) {
        setFlashClaimId(flashId);
        timer = window.setTimeout(() => setFlashClaimId(null), 3000);
      }
    }
    prevClaimIdsRef.current = new Set(ids);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on claim id/kind set
  }, [claimIdsKey]);

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
      <CaseFace
        bundle={bundle}
        flashPromise={Boolean(
          flashClaimId &&
            bundle.claims.some(
              (c) => c.kind === "promise" && c.id === flashClaimId,
            ),
        )}
      />
      <StepRail fileId={fileId} step={step} />
      <main className="mx-auto max-w-lg px-4 py-6 pb-28">
        {error ? (
          <p className="folio-card mb-4 px-4 py-3 text-sm text-stamp">
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
                await parseText({
                  userId,
                  fileId: asFileId(fileId),
                  rawText: noticeText,
                });
                setNoticeText("");
              })
            }
            onPhoto={(file) =>
              void run("photo", async () => {
                const blob = await compressNoticePhoto(file);
                const url = await uploadUrl({ userId });
                const posted = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": blob.type || "image/jpeg" },
                  body: blob,
                });
                if (!posted.ok) throw new Error("Photo did not upload");
                const { storageId } = (await posted.json()) as { storageId: string };
                await parsePhoto({
                  userId,
                  fileId: asFileId(fileId),
                  storageId: asStorageId(storageId),
                });
              })
            }
            onProof={(file) =>
              void run("proof", async () => {
                const blob = await compressNoticePhoto(file);
                const url = await uploadUrl({ userId });
                const posted = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": blob.type || "image/jpeg" },
                  body: blob,
                });
                if (!posted.ok) throw new Error("Photo did not upload");
                const { storageId } = (await posted.json()) as { storageId: string };
                await attachProof({
                  userId,
                  fileId: asFileId(fileId),
                  storageId: asStorageId(storageId),
                  servedMethod: "door_posting",
                });
              })
            }
            onCrawl={() =>
              void run("crawl", async () => {
                await crawl({ userId, fileId: asFileId(fileId) });
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
            flashClaimId={flashClaimId}
            replyText={replyText}
            setReplyText={setReplyText}
            onDraft={() =>
              void run("draft", async () => {
                await draft({ userId, fileId: asFileId(fileId) });
              })
            }
            onSend={(messageId) =>
              void run("send", async () => {
                const via = await send({
                  userId,
                  messageId: asMessageId(messageId),
                });
                if (via !== "agentmail") {
                  const msg = bundle.messages.find((m) => m.id === messageId);
                  if (msg) {
                    const href = mailtoHref(msg);
                    if (href) window.location.href = href;
                  }
                }
              })
            }
            onInbound={() =>
              void run("inbound", async () => {
                await logReply(userId, fileId, replyText);
                setReplyText("");
              })
            }
            onFriday={() =>
              void run("friday", async () => {
                await friday({ userId, fileId: asFileId(fileId) });
              })
            }
            onSeedChecklist={() =>
              void run("checklist", async () => {
                await seedChecklist({ userId, fileId: asFileId(fileId) });
              })
            }
            onChecklistStatus={(itemId, status) =>
              void run("checklist-status", async () => {
                await setChecklistStatus({
                  userId,
                  itemId: itemId as any,
                  status,
                });
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
                await pack({ userId, fileId: asFileId(fileId) });
              })
            }
            onWatch={async () => {
              const key = await ensureWatch({
                userId,
                fileId: asFileId(fileId),
              });
              const href = watchHref(key);
              await copyText(href);
              return href;
            }}
            onRevokeWatch={() =>
              void run("revoke-watch", async () => {
                await revokeWatch({
                  userId,
                  fileId: asFileId(fileId),
                });
              })
            }
            onAddLedger={(kind, amountCents, note) =>
              void run("ledger", async () => {
                await addLedger({
                  userId,
                  fileId: asFileId(fileId),
                  kind,
                  amountCents,
                  note,
                });
              })
            }
            onCourtCase={(courtCaseNumber) =>
              void run("court", async () => {
                await setCourtCase({
                  userId,
                  fileId: asFileId(fileId),
                  courtCaseNumber,
                });
              })
            }
            onExport={() =>
              void run("export", async () => {
                const packJson = await exportPack({
                  userId,
                  fileId: asFileId(fileId),
                });
                const blob = new Blob([JSON.stringify(packJson, null, 2)], {
                  type: "application/json",
                });
                const href = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = href;
                a.download = `folio-pack-${fileId}.json`;
                a.click();
                URL.revokeObjectURL(href);
                window.setTimeout(() => window.print(), 400);
              })
            }
          />
        ) : null}
      </main>
    </div>
  );
}


function noticeSourceLabel(source: string) {
  if (source.startsWith("photo:")) return "from photo";
  if (source.startsWith("typed:")) return "typed in";
  if (source === "paste") return "typed in";
  return source;
}

function NoticeScreen({
  bundle,
  busy,
  noticeText,
  setNoticeText,
  onIngest,
  onPhoto,
  onProof,
  onCrawl,
  onNext,
}: {
  bundle: FileBundle;
  busy: string | null;
  noticeText: string;
  setNoticeText: (v: string) => void;
  onIngest: () => void;
  onPhoto: (file: File) => void;
  onProof: (file: File) => void;
  onCrawl: () => void;
  onNext: () => void;
}) {
  const notice = bundle.notices[0];
  const violations = bundle.records.filter((r) => r.kind === "violation");
  const ready = Boolean(notice) && violations.length > 0;
  const [mode, setMode] = useState<"choose" | "snap" | "type">(
    notice ? "choose" : "choose",
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-serif text-xl">What was on the door</h3>
        {notice ? (
          <div className="folio-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
              On file
              {notice.source ? ` · ${noticeSourceLabel(notice.source)}` : ""}
            </p>
            <p className="mt-1 font-serif text-2xl leading-none">
              {statusLabel(notice.notice_type)}
            </p>
            {notice.deadline_on ? (
              <p className="mt-2 font-serif text-lg text-stamp">
                {deadlineCopy(notice.deadline_on) ?? formatDay(notice.deadline_on)}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted">
              Served {formatDay(notice.served_on)} · due{" "}
              {formatDay(notice.deadline_on)}
              {notice.plaintiff ? ` · ${notice.plaintiff}` : ""}
            </p>
            {notice.amount_cents != null ? (
              <p className="mt-1 text-sm font-medium">
                ${(notice.amount_cents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            ) : null}
            {notice.notice_photo_url ? (
              <img
                src={notice.notice_photo_url}
                alt="Notice on file"
                className="mt-3 max-h-40 rounded-xl object-cover"
              />
            ) : null}
            {notice.proof_photo_url ? (
              <img
                src={notice.proof_photo_url}
                alt="Proof of service"
                className="mt-2 max-h-32 rounded-xl object-cover"
              />
            ) : null}
            <label className="folio-btn-ghost mt-3 inline-flex cursor-pointer text-sm">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onProof(file);
                  e.target.value = "";
                }}
              />
              {busy === "proof" ? "Filing proof…" : "Proof of service"}
            </label>
            {notice.raw_text ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted">
                  Notice text
                </summary>
                <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-relaxed text-ink">
                  {notice.raw_text}
                </p>
              </details>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Get the deadline on the file. Snap the paper on the door, or type
              what it says — same structured notice either way.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={
                  mode === "snap"
                    ? "folio-btn"
                    : "folio-btn-ghost"
                }
                disabled={busy !== null}
                onClick={() => setMode("snap")}
              >
                Snap photo
              </button>
              <button
                type="button"
                className={
                  mode === "type"
                    ? "folio-btn"
                    : "folio-btn-ghost"
                }
                disabled={busy !== null}
                onClick={() => setMode("type")}
              >
                Type it in
              </button>
            </div>

            {mode === "snap" ? (
              <div className="folio-card space-y-3 px-5 py-4">
                <p className="text-sm text-muted">
                  Use the camera or pick a photo. Folio reads the deadline,
                  landlord, and amount with OpenAI vision.
                </p>
                <label className="folio-btn cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={busy !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onPhoto(file);
                      e.target.value = "";
                    }}
                  />
                  {busy === "photo"
                    ? "Reading the paper…"
                    : "Take or choose photo"}
                </label>
              </div>
            ) : null}

            {mode === "type" ? (
              <div className="folio-card space-y-3 px-5 py-4">
                <p className="text-sm text-muted">
                  Paste or type the notice word for word. Folio extracts the
                  deadline and parties (OpenAI when configured).
                </p>
                <textarea
                  className="folio-input min-h-40 font-serif"
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder={"FIVE DAY NOTICE…\nLANDLORD: …\nAmount due: $…"}
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
              </div>
            ) : null}

            {mode === "choose" ? (
              <p className="text-center text-xs text-muted">
                Pick Snap or Type to continue.
              </p>
            ) : null}
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
        <p className="rounded-2xl bg-chip px-3 py-2 text-xs leading-relaxed text-ink">
          Building-level city records — confirm they match your unit.
        </p>
        {violations.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            Inspectors already write this building up. Folio puts that list next
            to your notice so the letter is not just your word.
          </p>
        ) : (
          <ul className="space-y-2">
            {violations.slice(0, 8).map((r) => (
              <li key={r.id} className="folio-card px-4 py-3 text-sm">
                <p className="font-medium leading-snug">{r.title}</p>
                <p className="mt-1 text-xs text-muted">{r.agency}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        disabled={!ready || busy !== null}
        onClick={onNext}
        className="folio-btn"
      >
        Continue to the letter
      </button>
    </div>
  );
}

function LettersScreen({
  bundle,
  busy,
  flashClaimId,
  replyText,
  setReplyText,
  onDraft,
  onSend,
  onInbound,
  onFriday,
  onSeedChecklist,
  onChecklistStatus,
  onNext,
}: {
  bundle: FileBundle;
  busy: string | null;
  flashClaimId: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  onDraft: () => void;
  onSend: (id: string) => void;
  onInbound: () => void;
  onFriday: () => void;
  onSeedChecklist: () => void;
  onChecklistStatus: (itemId: string, status: string) => void;
  onNext: () => void;
}) {
  const demand = bundle.messages.find((m) => m.classification === "demand");
  const promise = bundle.claims.find((c) => c.kind === "promise");
  const sent = bundle.messages.some((m) => m.status === "sent");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-serif text-xl">Chicago RLTO checklist</h3>
        <p className="text-sm leading-relaxed text-muted">
          Prompts only — not legal advice. Flag what may matter for your file.
        </p>
        {bundle.checklist.length === 0 ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={onSeedChecklist}
            className="folio-btn-ghost w-full"
          >
            {busy === "checklist" ? "Loading…" : "Load Chicago checklist"}
          </button>
        ) : (
          <ul className="space-y-2">
            {bundle.checklist.map((item) => (
              <li key={item.id} className="folio-card px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium leading-snug">{item.title}</p>
                    <p className="mt-1 text-xs text-muted">{item.detail}</p>
                  </div>
                  <select
                    className="folio-input max-w-[7.5rem] shrink-0 py-1 text-xs"
                    value={item.status}
                    disabled={busy !== null}
                    aria-label={`Status for ${item.title}`}
                    onChange={(e) =>
                      onChecklistStatus(item.id, e.target.value)
                    }
                  >
                    <option value="open">Open</option>
                    <option value="flagged">Flagged</option>
                    <option value="cleared">Cleared</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
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
          <div
            className={`folio-card border-stamp/40 px-4 py-4${
              flashClaimId === promise.id ? " folio-claim-flash" : ""
            }`}
          >
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
            <button
              type="button"
              disabled={busy !== null}
              onClick={onFriday}
              className="folio-btn-stamp w-full"
            >
              {busy === "friday" ? "Stamping…" : "They said Friday — stamp it"}
            </button>
          </>
        )}
      </section>

      <button
        type="button"
        disabled={!sent && !promise && bundle.messages.length === 0}
        onClick={onNext}
        className="fixed inset-x-0 bottom-0 z-10 min-h-14 bg-filed text-sm font-semibold text-paper disabled:bg-rule sm:static sm:w-full sm:rounded-full"
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
    <li className="folio-card p-4 text-sm">
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
  onWatch,
  onRevokeWatch,
  onAddLedger,
  onCourtCase,
  onExport,
}: {
  bundle: FileBundle;
  busy: string | null;
  onPacket: () => void;
  onWatch: () => Promise<string>;
  onRevokeWatch: () => void;
  onAddLedger: (kind: string, amountCents: number, note: string) => void;
  onCourtCase: (courtCaseNumber: string) => void;
  onExport: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [caseNo, setCaseNo] = useState(bundle.file.court_case_number ?? "");
  const [ledgerKind, setLedgerKind] = useState("charge");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerNote, setLedgerNote] = useState("");
  const balance = bundle.ledger.reduce((sum, row) => {
    if (row.kind === "payment") return sum - Math.abs(row.amount_cents);
    return sum + row.amount_cents;
  }, 0);

  return (
    <div className="space-y-6">
      <section>
        <p className="inline-flex rounded-full bg-chip px-3 py-1 text-xs font-semibold text-filed">
          {bundle.file.jurisdiction_label ?? "Cook County · Chicago (wedge)"}
        </p>
        <h3 className="mt-3 font-serif text-xl">What you can hand someone</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Exhibit A the notice. Exhibit B Chicago’s list. Exhibit C the day they
          named. Print copies. Legal aid watches the live file.
        </p>
      </section>

      <section className="folio-card space-y-3 px-4 py-4">
        <h4 className="font-serif text-lg">Court case number</h4>
        <div className="flex gap-2">
          <input
            className="folio-input flex-1"
            value={caseNo}
            onChange={(e) => setCaseNo(e.target.value)}
            placeholder="e.g. 2026-M1-123456"
            aria-label="Court case number"
          />
          <button
            type="button"
            disabled={busy !== null}
            className="folio-btn-ghost shrink-0"
            onClick={() => onCourtCase(caseNo)}
          >
            {busy === "court" ? "Saving…" : "Save"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-serif text-lg">Rent ledger</h4>
        <p className="text-xs text-muted">
          Balance on file: $
          {(balance / 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        {bundle.ledger.length ? (
          <ul className="folio-card divide-y divide-rule overflow-hidden">
            {bundle.ledger.map((row) => (
              <li
                key={row.id}
                className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm"
              >
                <span>
                  <span className="font-medium capitalize">{row.kind}</span>
                  {row.note ? (
                    <span className="text-muted"> · {row.note}</span>
                  ) : null}
                  <span className="block text-xs text-muted">
                    {formatDay(row.occurred_on)}
                  </span>
                </span>
                <span className="font-serif">
                  {(row.kind === "payment" ? "-" : "") +
                    "$" +
                    (Math.abs(row.amount_cents) / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No ledger rows yet.</p>
        )}
        <div className="folio-card space-y-2 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="folio-input"
              value={ledgerKind}
              onChange={(e) => setLedgerKind(e.target.value)}
              aria-label="Ledger kind"
            >
              <option value="charge">Charge</option>
              <option value="payment">Payment</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <input
              className="folio-input"
              inputMode="decimal"
              placeholder="Amount $"
              value={ledgerAmount}
              onChange={(e) => setLedgerAmount(e.target.value)}
              aria-label="Ledger amount dollars"
            />
          </div>
          <input
            className="folio-input"
            placeholder="Note"
            value={ledgerNote}
            onChange={(e) => setLedgerNote(e.target.value)}
            aria-label="Ledger note"
          />
          <button
            type="button"
            className="folio-btn-ghost w-full"
            disabled={busy !== null || !ledgerAmount.trim()}
            onClick={() => {
              const dollars = Number(ledgerAmount);
              if (!Number.isFinite(dollars)) return;
              onAddLedger(ledgerKind, Math.round(dollars * 100), ledgerNote);
              setLedgerAmount("");
              setLedgerNote("");
            }}
          >
            {busy === "ledger" ? "Saving…" : "Add ledger entry"}
          </button>
        </div>
      </section>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() =>
          void onWatch().then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
        }
        className="folio-btn-ghost w-full"
      >
        {copied ? "Watch link copied" : "Copy watch link for legal aid"}
      </button>
      {bundle.file.watch_key ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (
              !window.confirm(
                "Revoke the watch link? Anyone with the old link will lose access.",
              )
            ) {
              return;
            }
            onRevokeWatch();
          }}
          className="folio-btn-ghost w-full border-stamp text-stamp"
        >
          {busy === "revoke-watch" ? "Revoking…" : "Revoke watch link"}
        </button>
      ) : null}
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
        <ol className="folio-card divide-y divide-rule overflow-hidden">
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
          className="flex min-h-14 items-center justify-center rounded-full bg-filed text-sm font-semibold text-paper"
        >
          Print / save PDF
        </Link>
      ) : null}
      <button
        type="button"
        disabled={busy !== null}
        onClick={onExport}
        className="folio-btn-ghost w-full"
      >
        {busy === "export" ? "Preparing…" : "Export pack (JSON + print)"}
      </button>
      <p className="text-xs leading-relaxed text-muted">
        Folio is a written record for {COOK.court}. It is not a lawyer and does
        not file in court.
      </p>
    </div>
  );
}
