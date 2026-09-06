# Folio trust model

Product is real Cook County / Chicago housing software. Prefer fail-closed.

## Auth isolation (Convex)

1. **Prefer Convex Auth identity.** `resolveUserId` uses `ctx.auth.getUserIdentity().subject` when present and rejects a mismatched client `userId`.
2. **Ownership on every mutate/read-by-id.** `requireFile` / `requireMessage` deny cross-user access (owner or `fileMembers` only). Errors are `"File not found"` / `"Unauthorized"` — no existence leaks beyond that.
3. **Hardened holes.** `setStatus`, `addEvent`, `getMessage`, `buildingStore.replace`, letter assemble/draft now require the caller user. `markSent` and `findByInbox` are **internal** (not browser-callable). Webhook inbound uses `logInboundInternal`.
4. **Residual risk.** Until Convex Auth (or a server-minted session proof) is enabled on the deployment, a browser client can still *claim* a `userId`. Ownership checks stop cross-file access only if the attacker does not know/guess another user's id. Guest mode uses email-as-id. **Follow-up:** enable Convex Auth or mint HMAC proofs from Better Auth server routes.

## Watch links

- `watchKey` is a high-entropy **share-by-link READ** capability for legal aid / clinic.
- `files.getByWatch` is the only public entry that accepts it.
- **Mutations never accept `watchKey`.** Link holders cannot ingest notices, send mail, replace building records, or change status.
- UI labels the surface "read only".

## Building identity

- Chicago SODA rows are filtered with normalized address matching (number required; direction mismatch fails; street-name confidence threshold `0.85`).
- Low-confidence rows are **skipped**, not attached.
- Weak addresses skip SODA attachment rather than broad `LIKE` matching.

## Claims from inbound mail

- Structured extraction (`promiseExtract`) requires commitment language **and** a concrete date/weekday before classifying a dated promise.
- Durable `claims` + deadlines are created **only** when `promiseOn` is present — no invented "+3 days" due dates.
- Undated "we will fix" language is stored as inbound mail without a dated claim.
