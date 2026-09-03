import type { Sql } from "@/lib/db";
import { draftDemand, parseInbound, parseNotice } from "./ai";
import { provisionInbox, sendAgentMail } from "./agentmail";
import { crawlChicagoBuilding, selfHelpRecord } from "./crawl";
import { crawlLegalAndSearch } from "./firecrawl";
import { addDaysIso, caseInbox, newId, todayIso } from "./ids";
import { COOK } from "./jurisdiction";
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

async function loadFile(
  sql: Sql,
  userId: string,
  fileId: string,
): Promise<AddressFile> {
  const owned = await sql<AddressFile>`
    select * from address_files where id = ${fileId} and user_id = ${userId} limit 1`;
  if (owned[0]) return owned[0];
  const shared = await sql<AddressFile>`
    select f.* from address_files f
    inner join file_members m on m.file_id = f.id
    where f.id = ${fileId} and m.user_id = ${userId}
    limit 1`;
  if (!shared[0]) throw new Error("File not found");
  return shared[0];
}

async function setStatus(
  sql: Sql,
  file: AddressFile,
  status: FileStatus,
): Promise<void> {
  const rank: FileStatus[] = [
    "opened",
    "notice_received",
    "building_pulled",
    "demand_drafted",
    "demand_sent",
    "answered",
    "packet_ready",
  ];
  if (rank.indexOf(status) < rank.indexOf(file.status)) return;
  await sql`
    update address_files set status = ${status}, updated_at = now()
    where id = ${file.id}`;
  file.status = status;
}

async function event(
  sql: Sql,
  file: AddressFile,
  kind: string,
  title: string,
  detail = "",
): Promise<void> {
  await sql`
    insert into timeline_events (id, file_id, user_id, kind, title, detail)
    values (${newId("ev")}, ${file.id}, ${file.user_id}, ${kind}, ${title}, ${detail})`;
}

export async function listFiles(
  sql: Sql,
  userId: string,
): Promise<AddressFile[]> {
  return sql<AddressFile>`
    select * from address_files
    where user_id = ${userId}
       or id in (select file_id from file_members where user_id = ${userId})
    order by updated_at desc`;
}

export async function getBundle(
  sql: Sql,
  userId: string,
  fileId: string,
): Promise<FileBundle> {
  const file = await loadFile(sql, userId, fileId);
  const [
    parties,
    notices,
    records,
    issues,
    claims,
    messages,
    exhibits,
    deadlines,
    events,
  ] = await Promise.all([
    sql<Party>`select * from parties where file_id = ${file.id} order by created_at`,
    sql<Notice>`select * from notices where file_id = ${file.id} order by created_at desc`,
    sql<PublicRecord>`select * from records where file_id = ${file.id} order by created_at desc`,
    sql<Issue>`select * from issues where file_id = ${file.id} order by created_at desc`,
    sql<Claim>`select * from claims where file_id = ${file.id} order by created_at desc`,
    sql<Message>`select * from messages where file_id = ${file.id} order by created_at desc`,
    sql<Exhibit>`select * from exhibits where file_id = ${file.id} order by label`,
    sql<Deadline>`select * from deadlines where file_id = ${file.id} order by due_on`,
    sql<TimelineEvent>`select * from timeline_events where file_id = ${file.id} order by created_at desc limit 40`,
  ]);
  return {
    file,
    parties,
    notices,
    records,
    issues,
    claims,
    messages,
    exhibits,
    deadlines,
    events,
  };
}

export async function createFile(
  sql: Sql,
  userId: string,
  input: {
    street: string;
    unit: string;
    city: string;
    state: string;
    zip: string;
    tenantName: string;
    tenantEmail?: string;
    ownerName?: string;
    ownerEmail?: string;
    clinicEmail?: string;
    demoKey?: string | null;
  },
): Promise<AddressFile> {
  const id = newId("file");
  const fallbackInbox = caseInbox(input.street, input.unit);
  const mail = await provisionInbox(
    `${input.unit || "unit"}-${input.street}`,
    `folio:${id}`,
  );
  const inbox = mail?.address ?? fallbackInbox;
  await sql`
    insert into address_files (
      id, user_id, demo_key, street, unit, city, state, zip, case_inbox,
      mail_inbox_id, mail_provider
    ) values (
      ${id}, ${userId}, ${input.demoKey ?? null}, ${input.street.trim()},
      ${input.unit.trim()}, ${input.city.trim() || "Chicago"},
      ${input.state.trim() || "IL"}, ${input.zip.trim()}, ${inbox},
      ${mail?.id ?? null}, ${mail?.provider ?? "mailto"}
    )`;
  if (input.tenantName.trim()) {
    await sql`
      insert into parties (id, file_id, user_id, kind, name, email)
      values (
        ${newId("pty")}, ${id}, ${userId}, ${"tenant"},
        ${input.tenantName.trim()}, ${input.tenantEmail?.trim() ?? ""}
      )`;
  }
  if (input.ownerName?.trim() || input.ownerEmail?.trim()) {
    await sql`
      insert into parties (id, file_id, user_id, kind, name, email, org)
      values (
        ${newId("pty")}, ${id}, ${userId}, ${"owner"},
        ${input.ownerName?.trim() || "Landlord"}, ${input.ownerEmail?.trim() ?? ""},
        ${input.ownerName?.trim() || ""}
      )`;
  }
  if (input.clinicEmail?.trim()) {
    await sql`
      insert into parties (id, file_id, user_id, kind, name, email, org)
      values (
        ${newId("pty")}, ${id}, ${userId}, ${"clinic"},
        ${"Legal aid"}, ${input.clinicEmail.trim()}, ${"Legal aid"}
      )`;
  }
  const file = await loadFile(sql, userId, id);
  await event(
    sql,
    file,
    "opened",
    `File opened for ${input.street}`,
    `Inbox ${inbox}`,
  );
  return file;
}

export async function ingestNotice(
  sql: Sql,
  userId: string,
  fileId: string,
  rawText: string,
): Promise<Notice> {
  const file = await loadFile(sql, userId, fileId);
  const parsed = await parseNotice(rawText);
  const id = newId("ntc");
  await sql`
    insert into notices (
      id, file_id, user_id, notice_type, served_on, deadline_on,
      plaintiff, amount_cents, reason, raw_text, source
    ) values (
      ${id}, ${file.id}, ${file.user_id}, ${parsed.noticeType},
      ${parsed.servedOn}, ${parsed.deadlineOn}, ${parsed.plaintiff},
      ${parsed.amountCents}, ${parsed.reason}, ${rawText}, ${"paste"}
    )`;
  if (parsed.plaintiff) {
    const existing = await sql<{ id: string }>`
      select id from parties where file_id = ${file.id} and kind = ${"owner"} limit 1`;
    if (!existing[0]) {
      await sql`
        insert into parties (id, file_id, user_id, kind, name, org)
        values (${newId("pty")}, ${file.id}, ${file.user_id}, ${"owner"}, ${parsed.plaintiff}, ${parsed.plaintiff})`;
    }
  }
  if (parsed.deadlineOn) {
    await sql`
      insert into deadlines (id, file_id, user_id, kind, title, due_on)
      values (
        ${newId("dl")}, ${file.id}, ${file.user_id}, ${"notice"},
        ${"Respond to notice / cure or appear"}, ${parsed.deadlineOn}
      )`;
  }
  await setStatus(sql, file, "notice_received");
  await event(
    sql,
    file,
    "notice",
    `${parsed.noticeType.replaceAll("_", " ")} filed on the docket`,
    parsed.plaintiff,
  );
  const rows = await sql<Notice>`select * from notices where id = ${id}`;
  return rows[0];
}

export async function crawlBuilding(
  sql: Sql,
  userId: string,
  fileId: string,
): Promise<PublicRecord[]> {
  const file = await loadFile(sql, userId, fileId);
  await sql`delete from records where file_id = ${file.id}`;
  const [soda, legal] = await Promise.all([
    crawlChicagoBuilding(file.street),
    crawlLegalAndSearch(file.street),
  ]);
  const helpFallback = legal.some((r) => r.kind === "self_help")
    ? []
    : [selfHelpRecord()];
  const crawled = [...soda, ...legal, ...helpFallback];
  const inserted: PublicRecord[] = [];
  for (const rec of crawled) {
    const id = newId("rec");
    await sql`
      insert into records (
        id, file_id, user_id, agency, kind, title, url, extracted, raw_excerpt, status
      ) values (
        ${id}, ${file.id}, ${file.user_id}, ${rec.agency}, ${rec.kind}, ${rec.title},
        ${rec.url}, ${JSON.stringify(rec.extracted)}, ${rec.rawExcerpt}, ${"ready"}
      )`;
    const row = await sql<PublicRecord>`select * from records where id = ${id}`;
    if (row[0]) inserted.push(row[0]);
  }
  const openViolations = crawled.filter(
    (r) =>
      r.kind === "violation" &&
      String(r.extracted.status || "").toUpperCase() === "OPEN",
  );
  if (openViolations[0]) {
    await sql`
      insert into issues (id, file_id, user_id, kind, title, detail, opened_on)
      values (
        ${newId("iss")}, ${file.id}, ${file.user_id}, ${"habitability"},
        ${"Open city building violations"},
        ${openViolations.map((v) => v.title).join("; ").slice(0, 800)},
        ${todayIso()}
      )`;
  }
  await setStatus(sql, file, "building_pulled");
  await event(
    sql,
    file,
    "records",
    `Pulled ${crawled.length} city records`,
    `${openViolations.length} open violations`,
  );
  return inserted;
}

function dollars(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

export async function proposeDefense(
  sql: Sql,
  userId: string,
  fileId: string,
): Promise<{ draftId: string }> {
  const bundle = await getBundle(sql, userId, fileId);
  const file = bundle.file;
  const notice = bundle.notices[0];
  const owner =
    bundle.parties.find((p) => p.kind === "owner")?.name ?? "Landlord";
  const ownerEmail =
    bundle.parties.find((p) => p.kind === "owner")?.email || "";
  const clinicEmail =
    bundle.parties.find((p) => p.kind === "clinic")?.email || "";
  const tenant =
    bundle.parties.find((p) => p.kind === "tenant")?.name ?? "Tenant";
  const violations = bundle.records
    .filter((r) => r.kind === "violation")
    .map((r) => r.title);
  const address = `${file.street}${file.unit ? `, Unit ${file.unit}` : ""}, ${file.city} ${file.state}`;

  const ai = await draftDemand({
    tenant,
    address,
    inbox: file.case_inbox,
    owner,
    ownerEmail,
    violations,
    noticeType: notice?.notice_type ?? "unknown",
    deadlineOn: notice?.deadline_on ?? null,
    amount: dollars(notice?.amount_cents ?? null),
  });

  const subject =
    ai?.subject ??
    `Written demand — ${address} — confirm repairs in writing`;
  const body =
    ai?.body ??
    [
      `To: ${owner}`,
      ``,
      `I am the tenant at ${address}. I received a ${notice?.notice_type.replaceAll("_", " ") ?? "notice"} dated ${notice?.served_on ?? "recently"}.`,
      ``,
      violations.length
        ? `The City of Chicago already lists these conditions on this building:\n${violations
            .slice(0, 5)
            .map((v) => `- ${v}`)
            .join("\n")}`
        : `Please confirm the current condition of heat, water, and structural repairs in writing.`,
      ``,
      `Please reply in writing with (1) any claim that rent is due and (2) a dated commitment to repair open conditions. An apology without a date is not a commitment.`,
      ``,
      `This is not legal advice and I am not represented by the sender of a court filing. I am creating a written record.`,
      ``,
      tenant,
      file.case_inbox,
    ].join("\n");

  const draftId = newId("msg");
  await sql`
    insert into messages (
      id, file_id, user_id, direction, to_email, from_email, subject, body,
      classification, status
    ) values (
      ${draftId}, ${file.id}, ${file.user_id}, ${"draft"}, ${ownerEmail},
      ${file.case_inbox}, ${subject}, ${body}, ${"demand"}, ${"pending_approval"}
    )`;

  const coverId = newId("msg");
  const cover = [
    `I need housing help for ${address}.`,
    notice
      ? `Notice: ${notice.notice_type.replaceAll("_", " ")} served ${notice.served_on}, deadline ${notice.deadline_on}.`
      : `I have a landlord notice.`,
    `I pulled City of Chicago building records into my file and can share the packet.`,
    ``,
    tenant,
  ].join("\n");
  await sql`
    insert into messages (
      id, file_id, user_id, direction, to_email, from_email, subject, body,
      classification, status
    ) values (
      ${coverId}, ${file.id}, ${file.user_id}, ${"draft"}, ${clinicEmail},
      ${""}, ${`Housing help — ${address}`}, ${cover}, ${"other"},
      ${"pending_approval"}
    )`;

  await setStatus(sql, file, "demand_drafted");
  await event(sql, file, "draft", "Demand and legal-aid cover awaiting approval");
  return { draftId };
}

export async function approveSend(
  sql: Sql,
  userId: string,
  messageId: string,
): Promise<Message> {
  const rows = await sql<Message>`select * from messages where id = ${messageId}`;
  const msg = rows[0];
  if (!msg) throw new Error("Message not found");
  const file = await loadFile(sql, userId, msg.file_id);
  let providerId: string | null = null;
  let via = file.mail_provider || "mailto";
  if (file.mail_inbox_id && msg.to_email) {
    const ok = await sendAgentMail({
      inboxId: file.mail_inbox_id,
      to: msg.to_email,
      subject: msg.subject,
      body: msg.body,
    });
    if (ok) {
      via = "agentmail";
      providerId = file.mail_inbox_id;
    }
  }
  await sql`
    update messages
    set status = ${"sent"}, direction = ${"outbound"}, sent_at = now(),
        provider_id = ${providerId}
    where id = ${messageId}`;
  if (msg.classification === "demand") {
    await setStatus(sql, file, "demand_sent");
  }
  await event(sql, file, "sent", `Sent via ${via}: ${msg.subject}`, msg.to_email);
  const updated = await sql<Message>`select * from messages where id = ${messageId}`;
  return updated[0];
}

export async function logInbound(
  sql: Sql,
  userId: string,
  fileId: string,
  body: string,
  fromEmail = "",
): Promise<Message> {
  const file = await loadFile(sql, userId, fileId);
  const text = body.trim();
  if (text.length < 8) throw new Error("Paste the reply you actually received");
  const owner =
    (
      await sql<Party>`select * from parties where file_id = ${file.id} and kind = ${"owner"} limit 1`
    )[0] ?? null;
  const parsed = await parseInbound(text, todayIso());
  const id = newId("msg");
  let claimId: string | null = null;
  if (parsed.classification === "promise") {
    claimId = newId("clm");
    await sql`
      insert into claims (
        id, file_id, user_id, kind, description, statute, status, promised_on, due_on
      ) values (
        ${claimId}, ${file.id}, ${file.user_id}, ${"promise"},
        ${parsed.summary}, ${COOK.habitability}, ${"open"}, ${todayIso()},
        ${parsed.promiseOn ?? addDaysIso(todayIso(), 3)}
      )`;
    await sql`
      insert into deadlines (id, file_id, user_id, kind, title, due_on)
      values (
        ${newId("dl")}, ${file.id}, ${file.user_id}, ${"promise"},
        ${"Landlord repair promise"}, ${parsed.promiseOn ?? addDaysIso(todayIso(), 3)}
      )`;
  }
  await sql`
    insert into messages (
      id, file_id, user_id, direction, to_email, from_email, subject, body,
      classification, status, related_claim_id
    ) values (
      ${id}, ${file.id}, ${file.user_id}, ${"inbound"}, ${""},
      ${fromEmail || owner?.email || ""}, ${"Logged reply"}, ${text},
      ${parsed.classification}, ${"received"}, ${claimId}
    )`;
  await setStatus(sql, file, "answered");
  await event(
    sql,
    file,
    "inbound",
    `Reply filed as ${parsed.classification}`,
    parsed.summary,
  );
  const msg = await sql<Message>`select * from messages where id = ${id}`;
  return msg[0];
}

export async function ingestMailWebhook(
  sql: Sql,
  input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    inboxId: string;
  },
): Promise<Message | null> {
  const needle = input.inboxId || input.to;
  if (!needle) return null;
  const files = await sql<AddressFile>`
    select * from address_files
    where case_inbox = ${input.to}
       or case_inbox = ${needle}
       or mail_inbox_id = ${input.inboxId}
    limit 1`;
  const file = files[0];
  if (!file) return null;
  return logInbound(sql, file.user_id, file.id, input.text, input.from);
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

export async function assemblePacket(
  sql: Sql,
  userId: string,
  fileId: string,
): Promise<Exhibit[]> {
  const bundle = await getBundle(sql, userId, fileId);
  const file = bundle.file;
  await sql`delete from exhibits where file_id = ${file.id}`;
  const pieces: { title: string; kind: string; table: string; id: string; body: string }[] =
    [];
  if (bundle.notices[0]) {
    const n = bundle.notices[0];
    pieces.push({
      title: `Notice — ${n.notice_type.replaceAll("_", " ")}`,
      kind: "notice",
      table: "notices",
      id: n.id,
      body: n.raw_text,
    });
  }
  const viol = bundle.records.filter((r) => r.kind === "violation");
  if (viol.length) {
    pieces.push({
      title: "City building violations",
      kind: "records",
      table: "records",
      id: viol[0].id,
      body: viol
        .map((v) => `${v.title}\n${v.raw_excerpt}\n${v.url}`)
        .join("\n\n"),
    });
  }
  const promise = bundle.claims.find((c) => c.kind === "promise");
  const inbound = bundle.messages.find((m) => m.direction === "inbound");
  if (inbound) {
    pieces.push({
      title: promise
        ? `Dated promise — due ${promise.due_on}`
        : "Landlord reply",
      kind: "promise",
      table: "messages",
      id: inbound.id,
      body: inbound.body,
    });
  }
  const help = bundle.records.find((r) => r.kind === "self_help");
  if (help) {
    pieces.push({
      title: "Illinois self-help and statutory notes",
      kind: "law",
      table: "records",
      id: help.id,
      body: help.raw_excerpt,
    });
  }
  const exhibits: Exhibit[] = [];
  for (let i = 0; i < pieces.length; i += 1) {
    const p = pieces[i];
    const id = newId("ex");
    const label = LABELS[i] ?? String(i + 1);
    await sql`
      insert into exhibits (
        id, file_id, user_id, label, title, kind, source_table, source_id, body
      ) values (
        ${id}, ${file.id}, ${file.user_id}, ${label}, ${p.title}, ${p.kind},
        ${p.table}, ${p.id}, ${p.body}
      )`;
    const row = await sql<Exhibit>`select * from exhibits where id = ${id}`;
    if (row[0]) exhibits.push(row[0]);
  }
  await setStatus(sql, file, "packet_ready");
  await event(
    sql,
    file,
    "packet",
    `Packet assembled — ${exhibits.length} exhibits`,
  );
  return exhibits;
}

export async function seedDemo(
  sql: Sql,
  userId: string,
): Promise<AddressFile> {
  const existing = await sql<AddressFile>`
    select * from address_files
    where user_id = ${userId} and demo_key = ${"cook-berteau-2f"}
    limit 1`;
  if (existing[0]) return existing[0];
  const d = COOK.demo;
  const file = await createFile(sql, userId, {
    street: d.street,
    unit: d.unit,
    city: d.city,
    state: d.state,
    zip: d.zip,
    tenantName: d.tenant,
    tenantEmail: d.tenantEmail,
    ownerName: d.owner,
    ownerEmail: d.ownerEmail,
    clinicEmail: d.clinicEmail,
    demoKey: "cook-berteau-2f",
  });
  await sql`
    insert into parties (id, file_id, user_id, kind, name, org)
    values (${newId("pty")}, ${file.id}, ${file.user_id}, ${"manager"}, ${d.manager}, ${d.manager})
  `;
  return file;
}
