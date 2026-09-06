# Folio trust model

Product is real Cook County / Chicago housing software. Prefer fail-closed.

## Convex Auth (product identity)

Convex Auth (`@convex-dev/auth`) is the **source of truth** for `userId` on the
Convex-hosted product path (`*.convex.site` / SPA deploy).
`getUserIdentity().subject` must match the Folio session `userId` used in
queries/mutations.

### Dashboard setup (required once per deployment)

1. Install deps (already in `package.json`): `@convex-dev/auth`, `@auth/core@0.41.1`.
2. Generate RS256 keys **locally** (do not commit output):

   ```bash
   node scripts/generate-convex-auth-keys.mjs
   ```

3. In the Convex dashboard -> deployment -> Settings -> Environment Variables, set:

   - `JWT_PRIVATE_KEY` — PKCS8 PEM from the script (as printed, one line)
   - `JWKS` — JSON JWKS from the script
   - `SITE_URL` — optional for Password-only; set if adding OAuth/magic links

4. Do not set ALLOW_CLAIMED_USERID in production (default requires identity).
   Local demos only: ALLOW_CLAIMED_USERID=true (spoofable).
5. Deploy backend so schema and auth HTTP routes are live.
6. Rebuild and redeploy the SPA.

### Sign-in UX

- Public hosts use Convex Auth password flow.
- Guest email-as-identity cannot open or mutate files.
- Watch links stay unauthenticated read-only.
- Better Auth ids do not auto-map to Convex Auth subjects.

### Dual-stack note

- Convex static hosting: Convex Auth -> identity.subject
- TanStack Start Better Auth: only with ALLOW_CLAIMED_USERID (dev) or after migration

## Auth isolation (Convex)

1. Require Convex Auth identity by default (resolveUserId).
2. Ownership on every mutate/read-by-id via requireFile/requireMessage.
3. Sensitive mutations require caller; webhook and markSent stay internal.
4. Residual risks: legacy guest/Better Auth rows do not auto-map; needs dashboard JWT material; keep AgentMail webhook secret set.

## Watch links

- watchKey is a high-entropy share-by-link READ capability for legal aid / clinic.
- files.getByWatch is the only public entry that accepts it.
- Mutations never accept watchKey. Link holders cannot ingest notices, send mail, replace building records, or change status.
- UI labels the surface read only.
- Owners revoke the capability with `revokeWatchKey` (clears `watchKey`).

## Building identity

- Chicago SODA rows are filtered with normalized address matching (number required; direction mismatch fails; street-name confidence threshold 0.85).
- Low-confidence rows are skipped, not attached.
- Weak addresses skip SODA attachment rather than broad LIKE matching.

## Claims from inbound mail

- Structured extraction (promiseExtract) requires commitment language and a concrete date/weekday before classifying a dated promise.
- Durable claims + deadlines are created only when promiseOn is present — no invented +3 days due dates.
- Undated we will fix language is stored as inbound mail without a dated claim.

## AgentMail webhook (fail-closed)

Inbound AgentMail webhooks **always** require `AGENTMAIL_WEBHOOK_SECRET`.
AgentMail must send matching header `x-agentmail-secret`.

- Env: `AGENTMAIL_WEBHOOK_SECRET` (Convex + app server)
- Header: `x-agentmail-secret`
- If the secret is unset **or** the header mismatches → **401**
- Soft-accept when unset is not allowed (both `convex/http.ts` and
  `src/routes/api/mail/webhook.ts`)

## Watch link revoke

Owners can call `files.revokeWatchKey` to clear `watchKey`. Old share links
stop resolving via `getByWatch`. A timeline event `Watch link revoked` is
recorded when a key was present.

