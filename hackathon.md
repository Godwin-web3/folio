# Folio — Convex All Gas

Everyday app: a Cook County tenant keeps one folio. The city’s building file, the notice on the door, and the date the landlord named live in that file.

## Live

- App: https://efficient-raccoon-976.convex.site
- Convex: https://dashboard.convex.dev/t/godwinxbt/folio/efficient-raccoon-976
- Backup: https://folio-three-taupe.vercel.app
- Repo: https://github.com/Godwin-web3/folio

## Stack (what does real work)

- **Convex** — `addressFiles` and children, live queries (`files.get` / `files.listCards`), mutations, crawl/send/demo actions.
- **Firecrawl** — scrape Illinois Legal Aid; Chicago SODA fills open violations.
- **AgentMail** — one inbox per apartment (`/v0/inboxes`, send via `/messages/send`). Inbound webhook: `POST https://efficient-raccoon-976.convex.site/agentmail/webhook`
- **OpenAI** — drafts the demand when `OPENAI_API_KEY` is set; otherwise a tight template.

## Demo (three minutes)

1. Open https://efficient-raccoon-976.convex.site — email, continue.
2. Photograph the paper on the door (OpenAI/xAI vision) or open 1757 W Berteau.
3. Pull Chicago — live open violations.
4. Copy the **watch link**. Second phone opens `/watch/…` and stays live.
5. Stamp Friday. Legal aid sees it without refresh.
6. Print Exhibit A / B / C. The judge will not look it up.

Not a lawyer. Does not e-file. Cook County first.

## Env (Convex dashboard)

- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
