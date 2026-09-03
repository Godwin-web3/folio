import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  approveSend,
  assemblePacket,
  crawlBuilding,
  createFile,
  getBundle,
  ingestNotice,
  listFiles,
  logInbound,
  proposeDefense,
  seedDemo,
} from "./engine";
import { COOK } from "./jurisdiction";

export const listAddressFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return listFiles(sql, context.userId);
  });

export const getAddressFile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return getBundle(sql, context.userId, data.fileId);
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
    const sql = await getSql();
    return createFile(sql, context.userId, data);
  });

export const ingestNoticeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ fileId: z.string(), rawText: z.string().min(20) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return ingestNotice(sql, context.userId, data.fileId, data.rawText);
  });

export const crawlBuildingFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return crawlBuilding(sql, context.userId, data.fileId);
  });

export const proposeDefenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return proposeDefense(sql, context.userId, data.fileId);
  });

export const approveSendFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ messageId: z.string() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return approveSend(sql, context.userId, data.messageId);
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
    const sql = await getSql();
    return logInbound(
      sql,
      context.userId,
      data.fileId,
      data.body,
      data.fromEmail,
    );
  });

export const assemblePacketFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ fileId: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return assemblePacket(sql, context.userId, data.fileId);
  });

export const seedDemoFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return seedDemo(sql, context.userId);
  });

export const demoNoticeText = COOK.demo.noticeText;
