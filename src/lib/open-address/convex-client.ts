import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  AddressFile,
  Claim,
  Deadline,
  Exhibit,
  FileBundle,
  FileStatus,
  Issue,
  Message,
  Notice,
  Party,
  PublicRecord,
  TimelineEvent,
} from "./types";

export const CONVEX_URL = "https://efficient-raccoon-976.convex.cloud";

export const convex = new ConvexHttpClient(CONVEX_URL);
export { api };
export type FileId = Id<"addressFiles">;
export type MessageId = Id<"messages">;

function iso(ts: number | undefined): string {
  return new Date(ts ?? Date.now()).toISOString();
}

function asFile(doc: Record<string, unknown>): AddressFile {
  return {
    id: String(doc._id),
    user_id: String(doc.userId),
    demo_key: (doc.demoKey as string | undefined) ?? null,
    street: String(doc.street),
    unit: String(doc.unit ?? ""),
    city: String(doc.city),
    state: String(doc.state),
    zip: String(doc.zip ?? ""),
    jurisdiction: String(doc.jurisdiction ?? "cook-county-il"),
    status: (doc.status as FileStatus) ?? "opened",
    case_inbox: String(doc.caseInbox),
    mail_inbox_id: (doc.mailInboxId as string | undefined) ?? null,
    mail_provider: String(doc.mailProvider ?? "mailto"),
    created_at: iso(doc._creationTime as number),
    updated_at: iso(doc._creationTime as number),
  };
}

function asParty(doc: Record<string, unknown>): Party {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    kind: String(doc.kind),
    name: String(doc.name),
    email: String(doc.email ?? ""),
    org: String(doc.org ?? ""),
    notes: String(doc.notes ?? ""),
    created_at: iso(doc._creationTime as number),
  };
}

function asNotice(doc: Record<string, unknown>): Notice {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    notice_type: String(doc.noticeType),
    served_on: (doc.servedOn as string | undefined) ?? null,
    deadline_on: (doc.deadlineOn as string | undefined) ?? null,
    plaintiff: String(doc.plaintiff ?? ""),
    amount_cents: (doc.amountCents as number | undefined) ?? null,
    reason: String(doc.reason ?? ""),
    raw_text: String(doc.rawText ?? ""),
    source: String(doc.source ?? "paste"),
    created_at: iso(doc._creationTime as number),
  };
}

function asRecord(doc: Record<string, unknown>): PublicRecord {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    agency: String(doc.agency),
    kind: String(doc.kind),
    title: String(doc.title),
    url: String(doc.url ?? ""),
    extracted: String(doc.extracted ?? "{}"),
    raw_excerpt: String(doc.rawExcerpt ?? ""),
    status: String(doc.status ?? "ready"),
    created_at: iso(doc._creationTime as number),
  };
}

function asIssue(doc: Record<string, unknown>): Issue {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    kind: String(doc.kind),
    title: String(doc.title),
    detail: String(doc.detail ?? ""),
    status: String(doc.status ?? "open"),
    opened_on: (doc.openedOn as string | undefined) ?? null,
    created_at: iso(doc._creationTime as number),
  };
}

function asClaim(doc: Record<string, unknown>): Claim {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    kind: String(doc.kind),
    amount_cents: (doc.amountCents as number | undefined) ?? null,
    description: String(doc.description),
    statute: String(doc.statute ?? ""),
    status: String(doc.status ?? "open"),
    promised_on: (doc.promisedOn as string | undefined) ?? null,
    due_on: (doc.dueOn as string | undefined) ?? null,
    created_at: iso(doc._creationTime as number),
  };
}

function asMessage(doc: Record<string, unknown>): Message {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    direction: doc.direction as Message["direction"],
    to_email: String(doc.toEmail ?? ""),
    from_email: String(doc.fromEmail ?? ""),
    subject: String(doc.subject),
    body: String(doc.body),
    classification: String(doc.classification ?? "other"),
    status: String(doc.status),
    related_claim_id: (doc.relatedClaimId as string | undefined) ?? null,
    provider_id: (doc.providerId as string | undefined) ?? null,
    created_at: iso(doc._creationTime as number),
    sent_at: doc.sentAt ? iso(doc.sentAt as number) : null,
  };
}

function asExhibit(doc: Record<string, unknown>): Exhibit {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    label: String(doc.label),
    title: String(doc.title),
    kind: String(doc.kind),
    source_table: String(doc.sourceTable ?? ""),
    source_id: String(doc.sourceId ?? ""),
    body: String(doc.body ?? ""),
    created_at: iso(doc._creationTime as number),
  };
}

function asDeadline(doc: Record<string, unknown>): Deadline {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    kind: String(doc.kind),
    title: String(doc.title),
    due_on: String(doc.dueOn),
    completed_at: doc.completedAt ? iso(doc.completedAt as number) : null,
    created_at: iso(doc._creationTime as number),
  };
}

function asEvent(doc: Record<string, unknown>): TimelineEvent {
  return {
    id: String(doc._id),
    file_id: String(doc.fileId),
    user_id: String(doc.userId),
    kind: String(doc.kind),
    title: String(doc.title),
    detail: String(doc.detail ?? ""),
    created_at: iso(doc._creationTime as number),
  };
}

export function mapFile(doc: unknown): AddressFile {
  return asFile(doc as Record<string, unknown>);
}

export function mapMessage(doc: unknown): Message {
  return asMessage(doc as Record<string, unknown>);
}

export function mapBundle(raw: {
  file: unknown;
  parties: unknown[];
  notices: unknown[];
  records: unknown[];
  issues: unknown[];
  claims: unknown[];
  messages: unknown[];
  exhibits: unknown[];
  deadlines: unknown[];
  events: unknown[];
}): FileBundle {
  return {
    file: asFile(raw.file as Record<string, unknown>),
    parties: raw.parties.map((p) => asParty(p as Record<string, unknown>)),
    notices: raw.notices.map((p) => asNotice(p as Record<string, unknown>)),
    records: raw.records.map((p) => asRecord(p as Record<string, unknown>)),
    issues: raw.issues.map((p) => asIssue(p as Record<string, unknown>)),
    claims: raw.claims.map((p) => asClaim(p as Record<string, unknown>)),
    messages: raw.messages.map((p) => asMessage(p as Record<string, unknown>)),
    exhibits: raw.exhibits.map((p) => asExhibit(p as Record<string, unknown>)),
    deadlines: raw.deadlines.map((p) => asDeadline(p as Record<string, unknown>)),
    events: raw.events.map((p) => asEvent(p as Record<string, unknown>)),
  };
}

export function asFileId(id: string): FileId {
  return id as FileId;
}

export function asMessageId(id: string): MessageId {
  return id as MessageId;
}
