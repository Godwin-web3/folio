# Folio

One housing file per apartment. Cook County first.

The notice on the door, the city’s building records, the letter you send, and the landlord’s reply — including a dated promise — live in one folio. Not a lawyer. Does not e-file.

Built for the [Convex All Gas Hackathon](https://www.convex.dev/hackathons/all-gas). See [hackathon.md](./hackathon.md).

## What it does

1. Open a Chicago street.
2. Paste the five-day (or other) notice — deadline hits the file.
3. Pull the building — live Chicago open violations + Illinois Legal Aid self-help.
4. Draft a demand. You hit send.
5. A reply that says “we’ll fix it Friday” becomes a dated claim.
6. Print a packet for legal aid.

## Stack

- **Convex** — `convex/` schema, queries, mutations, crawl action, AgentMail webhook
- **Firecrawl** — scrape / search into the file
- **AgentMail** — one inbox per apartment; inbound webhook
- **OpenAI / xAI** — parse the notice, draft the letter
- Preview app is TanStack Start (this repo) talking to the same domain model

## Run the Convex backend

```bash
npm i
npx convex dev
```

Set in the Convex dashboard:

- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET`
- `OPENAI_API_KEY`

Webhook path: `POST /agentmail/webhook`

## Jurisdiction

Cook County / City of Chicago. Chicago RLTO, 735 ILCS 5/9-209, 765 ILCS 720. Expand later as jurisdiction packs, not as a rewrite.
