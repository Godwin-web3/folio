/** Domain types for Folio. Maps 1:1 to Convex tables in the All Gas port. */

export type FileStatus =
  | "opened"
  | "notice_received"
  | "building_pulled"
  | "demand_drafted"
  | "demand_sent"
  | "answered"
  | "packet_ready";

export type AddressFile = {
  id: string;
  user_id: string;
  demo_key: string | null;
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  jurisdiction: string;
  status: FileStatus;
  case_inbox: string;
  mail_inbox_id: string | null;
  mail_provider: string;
  watch_key: string | null;
  created_at: string;
  updated_at: string;
};

export type Party = {
  id: string;
  file_id: string;
  user_id: string;
  kind: "tenant" | "owner" | "manager" | "clinic" | "city" | string;
  name: string;
  email: string;
  org: string;
  notes: string;
  created_at: string;
};

export type Notice = {
  id: string;
  file_id: string;
  user_id: string;
  notice_type: string;
  served_on: string | null;
  deadline_on: string | null;
  plaintiff: string;
  amount_cents: number | null;
  reason: string;
  raw_text: string;
  source: string;
  created_at: string;
};

export type PublicRecord = {
  id: string;
  file_id: string;
  user_id: string;
  agency: string;
  kind: string;
  title: string;
  url: string;
  extracted: string;
  raw_excerpt: string;
  status: string;
  created_at: string;
};

export type Issue = {
  id: string;
  file_id: string;
  user_id: string;
  kind: string;
  title: string;
  detail: string;
  status: string;
  opened_on: string | null;
  created_at: string;
};

export type Claim = {
  id: string;
  file_id: string;
  user_id: string;
  kind: string;
  amount_cents: number | null;
  description: string;
  statute: string;
  status: string;
  promised_on: string | null;
  due_on: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  file_id: string;
  user_id: string;
  direction: "inbound" | "outbound" | "draft";
  to_email: string;
  from_email: string;
  subject: string;
  body: string;
  classification: string;
  status: string;
  related_claim_id: string | null;
  provider_id: string | null;
  created_at: string;
  sent_at: string | null;
};

export type Exhibit = {
  id: string;
  file_id: string;
  user_id: string;
  label: string;
  title: string;
  kind: string;
  source_table: string;
  source_id: string;
  body: string;
  created_at: string;
};

export type Deadline = {
  id: string;
  file_id: string;
  user_id: string;
  kind: string;
  title: string;
  due_on: string;
  completed_at: string | null;
  created_at: string;
};

export type TimelineEvent = {
  id: string;
  file_id: string;
  user_id: string;
  kind: string;
  title: string;
  detail: string;
  created_at: string;
};

export type FileBundle = {
  file: AddressFile;
  parties: Party[];
  notices: Notice[];
  records: PublicRecord[];
  issues: Issue[];
  claims: Claim[];
  messages: Message[];
  exhibits: Exhibit[];
  deadlines: Deadline[];
  events: TimelineEvent[];
};

export type NoticeParse = {
  noticeType: string;
  servedOn: string | null;
  deadlineOn: string | null;
  plaintiff: string;
  amountCents: number | null;
  reason: string;
};

export type InboundParse = {
  classification: string;
  promiseOn: string | null;
  summary: string;
};
