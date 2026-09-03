import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseInbound, parseNotice } from "./ai";
import {
  api,
  asFileId,
  asMessageId,
  convex,
  mapBundle,
  mapFile,
  mapMessage,
} from "./convex-client";
import { COOK } from "./jurisdiction";

export const listAddressFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const rows = await convex.query(api.files.list, { userId: context.userId });
    return rows.map((r: unknown) => mapFile(r));
  });

export const getAddressFile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const raw = await convex.query(api.files.get, {
      userId: context.userId,
      fileId: asFileId(data.fileId),
    });
    return mapBundle(raw);
  });

export const createAddressFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        street: z.string().min(3),
        unit: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        tenantName: z.string(),
        tenantEmail: z.string().optional(),
        ownerName: z.string().optional(),
        ownerEmail: z.string().optional(),
        clinicEmail: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const fileId = await convex.action(api.open.openFile, {
      userId: context.userId,
      ...data,
    });
    const raw = await convex.query(api.files.get, {
      userId: context.userId,
      fileId,
    });
    return mapBundle(raw).file;
  });

export const ingestNoticeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ fileId: z.string(), rawText: z.string().min(20) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const parsed = await parseNotice(data.rawText);
    await convex.mutation(api.files.ingestNotice, {
      userId: context.userId,
      fileId: asFileId(data.fileId),
      noticeType: parsed.noticeType,
      servedOn: parsed.servedOn ?? undefined,
      deadlineOn: parsed.deadlineOn ?? undefined,
      plaintiff: parsed.plaintiff,
      amountCents: parsed.amountCents ?? undefined,
      reason: parsed.reason,
      rawText: data.rawText,
    });
  });

export const crawlBuildingFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    await convex.action(api.building.crawlBuilding, {
      userId: context.userId,
      fileId: asFileId(data.fileId),
    });
  });

export const proposeDefenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    await convex.action(api.letters.propose, {
      userId: context.userId,
      fileId: asFileId(data.fileId),
    });
  });

export const approveSendFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ messageId: z.string() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await convex.action(api.mail.approveSend, {
      userId: context.userId,
      messageId: asMessageId(data.messageId),
    });
    const msg = await convex.query(api.mail.getMessage, {
      messageId: asMessageId(data.messageId),
    });
    if (!msg) throw new Error("Message not found");
    return mapMessage(msg);
  });

export const logInboundFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        fileId: z.string(),
        body: z.string().min(8),
        fromEmail: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const parsed = await parseInbound(data.body, new Date().toISOString().slice(0, 10));
    await convex.mutation(api.mail.logInbound, {
      fileId: asFileId(data.fileId),
      from: data.fromEmail ?? "",
      body: data.body,
      classification: parsed.classification,
      summary: parsed.summary,
      promiseOn: parsed.promiseOn ?? undefined,
    });
  });

export const assemblePacketFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    await convex.mutation(api.letters.assemble, {
      userId: context.userId,
      fileId: asFileId(data.fileId),
    });
  });

export const seedDemoFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const existing = await convex.query(api.files.findDemo, {
      userId: context.userId,
      demoKey: "cook-berteau-2f",
    });
    if (existing) return mapFile(existing);
    const d = COOK.demo;
    const fileId = await convex.action(api.open.openFile, {
      userId: context.userId,
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
    const raw = await convex.query(api.files.get, {
      userId: context.userId,
      fileId,
    });
    return mapBundle(raw).file;
  });

export const demoNoticeText = COOK.demo.noticeText;
