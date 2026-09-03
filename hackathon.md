# Folio — Convex All Gas

Everyday app: a Cook County tenant keeps one folio. The notice, the city’s building records, the letter they actually send, and the landlord’s reply live in that file.

## Stack (what does real work)

- **Convex** — `addressFiles` and children, live queries (`files.get` / `files.list`), mutations for notice/packet, actions for crawl and send.
- **Firecrawl** — scrape Illinois Legal Aid self-help and search the building; Chicago SODA fills structured violations.
- **AgentMail** — one inbox per apartment. Approve sends from that inbox. Inbound webhook classifies a repair promise onto the ledger.
- **OpenAI / xAI** — parse the five-day notice and draft the demand. A human still has to hit send.

## Demo (three minutes)

1. Open a Chicago street.
2. Paste the notice on the door — deadline hits the file.
3. Pull the building — live open violations + Firecrawl legal-aid page.
4. Draft. Approve. Mail leaves from the case inbox.
5. Landlord says “we’ll fix it Friday” — that becomes a dated promise.
6. Print the packet.

Not a lawyer. Does not e-file. Cook County first.

## Env (Convex dashboard)

- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET`
- `OPENAI_API_KEY` (or `XAI_API_KEY` in this preview)

Webhook: `POST /agentmail/webhook` on the Convex HTTP router (and `/api/mail/webhook` on this preview).
