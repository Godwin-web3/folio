import { COOK } from "./jurisdiction";
import { fallbackInbound, fallbackNotice } from "./parse";
import { todayIso } from "./ids";
import {
  api,
  asFileId,
  asMessageId,
  convex,
  mapBundle,
  mapFile,
  mapMessage,
} from "./convex-client";
import type { AddressFile, FileBundle } from "./types";

export async function listFiles(userId: string): Promise<AddressFile[]> {
  const rows = await convex.query(api.files.list, { userId });
  return rows.map((r: unknown) => mapFile(r));
}

export async function getFile(
  userId: string,
  fileId: string,
): Promise<FileBundle> {
  const raw = await convex.query(api.files.get, {
    userId,
    fileId: asFileId(fileId),
  });
  return mapBundle(raw);
}

export async function openFile(
  userId: string,
  data: {
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
  },
): Promise<AddressFile> {
  const fileId = await convex.action(api.open.openFile, { userId, ...data });
  const bundle = await getFile(userId, fileId);
  return bundle.file;
}

export async function ingestNotice(
  userId: string,
  fileId: string,
  rawText: string,
): Promise<void> {
  const parsed = fallbackNotice(rawText);
  await convex.mutation(api.files.ingestNotice, {
    userId,
    fileId: asFileId(fileId),
    noticeType: parsed.noticeType,
    servedOn: parsed.servedOn ?? undefined,
    deadlineOn: parsed.deadlineOn ?? undefined,
    plaintiff: parsed.plaintiff,
    amountCents: parsed.amountCents ?? undefined,
    reason: parsed.reason,
    rawText,
  });
}

export async function pullBuilding(
  userId: string,
  fileId: string,
): Promise<void> {
  await convex.action(api.building.crawlBuilding, {
    userId,
    fileId: asFileId(fileId),
  });
}

export async function draftLetters(
  userId: string,
  fileId: string,
): Promise<void> {
  await convex.action(api.letters.propose, {
    userId,
    fileId: asFileId(fileId),
  });
}

export async function sendLetter(
  userId: string,
  messageId: string,
) {
  await convex.action(api.mail.approveSend, {
    userId,
    messageId: asMessageId(messageId),
  });
  const msg = await convex.query(api.mail.getMessage, {
    messageId: asMessageId(messageId),
  });
  if (!msg) throw new Error("Message not found");
  return mapMessage(msg);
}

export async function logReply(
  userId: string,
  fileId: string,
  body: string,
  fromEmail?: string,
): Promise<void> {
  const parsed = fallbackInbound(body, todayIso());
  await convex.mutation(api.mail.logInbound, {
    fileId: asFileId(fileId),
    from: fromEmail ?? "",
    body,
    classification: parsed.classification,
    summary: parsed.summary,
    promiseOn: parsed.promiseOn ?? undefined,
  });
}

export async function buildPacket(
  userId: string,
  fileId: string,
): Promise<void> {
  await convex.mutation(api.letters.assemble, {
    userId,
    fileId: asFileId(fileId),
  });
}

export async function loadSample(userId: string): Promise<AddressFile> {
  const existing = await convex.query(api.files.findDemo, {
    userId,
    demoKey: "cook-berteau-2f",
  });
  if (existing) return mapFile(existing);
  const d = COOK.demo;
  const fileId = await convex.action(api.open.openFile, {
    userId,
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
  return (await getFile(userId, fileId)).file;
}

export { COOK };
