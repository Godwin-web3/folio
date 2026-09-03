import { createFileRoute } from "@tanstack/react-router";
import { parseAgentMailWebhook } from "@/lib/open-address/agentmail";
import { ingestMailWebhook } from "@/lib/open-address/engine";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/mail/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
        if (secret) {
          const got = request.headers.get("x-agentmail-secret");
          if (got !== secret) {
            return new Response("unauthorized", { status: 401 });
          }
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        const parsed = parseAgentMailWebhook(raw);
        if (!parsed) {
          return new Response(JSON.stringify({ ok: false }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        }
        const sql = await getSql();
        const msg = await ingestMailWebhook(sql, parsed);
        return new Response(
          JSON.stringify({ ok: true, messageId: msg?.id ?? null }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
