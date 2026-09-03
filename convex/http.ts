import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
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
    const file = await ctx.runQuery(api.mail.findByInbox, {
      inbox: inboxId || to,
    });
    if (!file) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    const promise = /will (fix|repair)|friday|next week/.test(text.toLowerCase());
    await ctx.runMutation(api.mail.logInbound, {
      fileId: file._id,
      from,
      body: text,
      classification: promise ? "promise" : "other",
      summary: text.slice(0, 240),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }),
});

export default http;
