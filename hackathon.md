# Folio — Convex All Gas

**If they name a day, that day is a claim.**

Folio is a Cook County / Chicago housing file — one folio per apartment. The notice on the door, Chicago’s own building records, and the date the landlord named in writing all live in the same place. Legal aid can watch the file live. The tenant prints Exhibit A / B / C without hunting through email.

This is everyday software for a real eviction timeline, not a toy demo. Not a lawyer. Does not e-file. Cook County first.

## Live (open this)

| | |
|---|---|
| **App** | https://efficient-raccoon-976.convex.site |
| **Repo** | https://github.com/Godwin-web3/folio |
| **Convex** | https://dashboard.convex.dev/t/godwinxbt/folio/efficient-raccoon-976 |
| **Trust model** | [`docs/TRUST.md`](docs/TRUST.md) |

Judges: use the live `convex.site` URL. Sign up with email + password (Convex Auth). Prefer a phone or a narrow browser window — Folio is built for mobile tenants.

## Why it scores (All Gas rubric)

| Criterion | Where it shows |
|---|---|
| **Everyday usefulness** | Notice → city file → dated promise → packet a tenant can hand to legal aid or court intake |
| **Convex depth** | Auth identity on every mutate; live queries for the file + watch link; components (static hosting); actions for crawl / vision / mail; internal webhook mutation |
| **Sponsor stack (visible)** | **OpenAI** Type \| Snap notice parse + demand draft · **Firecrawl** Illinois Legal Aid scrape next to SODA violations · **AgentMail** per-apartment inbox + fail-closed webhook |
| **Social / video** | Loom &lt; 3 min (link when posted) · share the watch-link moment |

## Killer demo (&lt; 3 minutes)

1. **Open** https://efficient-raccoon-976.convex.site → sign up / log in.
2. **Open or create** a file (demo address works: **1757 W Berteau**, Chicago).
3. **Notice — Type or Snap**  
   - **Snap photo** of a five-day / pay-or-quit (OpenAI vision when `OPENAI_API_KEY` is set), **or**  
   - **Type it in** — paste the notice; Folio structures deadline, landlord, amount.
4. **Pull Chicago** — open building violations land next to the notice (address-matched; junk rows filtered).
5. **Draft + send** the demand (cites the city list; asks for a date in writing). AgentMail when keyed; mailto fallback otherwise.
6. **Two phones** — copy **watch link** for legal aid. Second device opens `/watch/…` read-only and stays live. Owner can **revoke** the link anytime.
7. **Stamp the claim** — “They said Friday” (or paste a real reply). The dated promise **flashes** on the file. Watcher sees it without refresh.
8. **Packet** — Exhibit A notice · B Chicago · C the day they named. Print / save PDF.

Tagline for the video: *If they name a Friday, that Friday is a claim.*

## Convex surface (depth, not decoration)

- **`addressFiles` + children** — notices, records, claims, messages, exhibits, deadlines, timeline, members
- **Live queries** — `files.get`, `files.listCards`, `files.getByWatch` (capability URL, read-only)
- **Authz** — Convex Auth Password; `resolveUserId` / `requireFile` on mutates; watch never writes
- **Actions** — `building.crawlBuilding`, `photo.parseNoticePhoto` / `parseNoticeText`, `mail.approveSend`, `mail.stampFriday`, `letters.propose`
- **HTTP** — Convex Auth routes · `POST /agentmail/webhook` (requires `AGENTMAIL_WEBHOOK_SECRET` + `x-agentmail-secret`) · static SPA via `@convex-dev/static-hosting`
- **Trust extras** — claim flash on inbound dated promise · `revokeWatchKey` · exhibit-ready city titles

## Sponsor wiring (what actually runs)

| Sponsor | Job in Folio |
|---|---|
| **OpenAI** | Vision + text parse for door notices; demand letter when key present |
| **Firecrawl** | Scrape Illinois Legal Aid self-help into the building pull |
| **AgentMail** | One inbox per apartment; send demand; inbound webhook → dated claim |

Chicago open data (SODA) fills violations/licenses with **normalized address matching** — Firecrawl does not invent the city list.

## Env (Convex dashboard → Environment Variables)

Required for full sponsor-visible demo:

- `JWT_PRIVATE_KEY` / `JWKS` / `SITE_URL` — Convex Auth
- `FIRECRAWL_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_WEBHOOK_SECRET` — webhook fail-closed
- `OPENAI_API_KEY` — Snap + strong Type parse + LLM demand draft

## Links to paste in submission

- Live app: https://efficient-raccoon-976.convex.site  
- Repo: https://github.com/Godwin-web3/folio  
- This file: `hackathon.md`  
- Trust: `docs/TRUST.md`  
- Video: _(add Loom URL)_  
- Social proof: _(add posts)_  

Built by Godwin · Convex All Gas · deadline Sep 22, 2026, 12:00 PM PT
