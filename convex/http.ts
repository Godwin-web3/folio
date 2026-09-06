import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { extractInboundPromise } from "./lib/promiseExtract";
import { todayIso } from "./lib";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth HTTP routes (sign-in callbacks, JWKS, etc.)
auth.addHttpRoutes(http);

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    // Fail closed when secret is configured; when unset, still accept (dev) but
    // never expose write paths without inbox routing.
    if (secret && request.headers.get("x-agentmail-secret") !== secret) {
      return new Response("unauthorized", { status: 401 });
    }
    const raw = await request.json();
    const msg = (raw?.message ?? raw?.data ?? raw) as Record<string, string>;
    const text = String(msg.text ?? msg.body ?? "");
    const to = String(msg.to ?? msg.inbox ?? "");
    const from = String(msg.from ?? "");
    const inboxId = String(msg.inbox_id ?? msg.inboxId ?? "");
    if (text.trim().length < 8) {
      return new Response(JSON.stringify({ ok: false }), { status: 202 });
    }
    const file = await ctx.runQuery(internal.mail.findByInbox, {
      inbox: inboxId || to,
    });
    if (!file) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    const extracted = extractInboundPromise(text, todayIso());
    await ctx.runMutation(internal.mail.logInboundInternal, {
      fileId: file._id,
      from,
      body: text,
      classification: extracted.classification,
      summary: extracted.summary,
      promiseOn: extracted.promiseOn ?? undefined,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }),
});

registerStaticRoutes(http, components.staticHosting);

export default http;
