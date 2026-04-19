# Integrating `@bsv/payment-express-middleware` — Pitfalls & Patterns

A field guide for anyone wiring `@bsv/auth-express-middleware` +
`@bsv/payment-express-middleware` onto an Express server to accept BRC-103/104
authentication and BRC-29/105 BSV micropayments.

Written after debugging a live x402 surface (BrandCaster.studio) end-to-end
with a real client (Claude Code via MetaNet Desktop wallet). Each section is
a real bug we hit, the diagnosis, and the fix.

---

## 1. `ProtoWallet` is not enough — it has no `internalizeAction`

**Symptom:** Handshake works, but the first paid call returns
`400 ERR_PAYMENT_FAILED — wallet.internalizeAction is not a function`.

**Cause:** `ProtoWallet` from `@bsv/sdk` only implements the *crypto* surface
of `WalletInterface` (sign / verify / encrypt / `getPublicKey`). It is enough
to satisfy the auth middleware's BRC-103 handshake, but the payment middleware
calls `wallet.internalizeAction(...)` to receive the inbound transaction —
which `ProtoWallet` does not implement.

**Fix:** Subclass `ProtoWallet` and add an `internalizeAction` that:

1. Parses the incoming tx bytes (try `Transaction.fromAtomicBEEF` →
   `Transaction.fromBEEF` → `Transaction.fromBinary` in that order).
2. For each `args.outputs[i]`, derives the expected P2PKH script and compares
   it byte-for-byte to `tx.outputs[outputIndex].lockingScript`.
3. Verifies the output value is at least the price the route required.
4. Broadcasts the tx (see §6).
5. Returns `{ accepted: true, txid }`.

A reference implementation is in `src/lib/x402/wallet.ts` of this repo.

---

## 2. The `forSelf: true` trap in BRC-29 derivation

**Symptom:** Payment received, but server rejects with
`output 0 does not pay to derived BRC-29 key` even though both sides agree on
prefix, suffix, and identity keys.

**Cause:** `wallet.getPublicKey({protocolID, keyID, counterparty})` defaults to
`forSelf: false`, which returns the **counterparty's** derived public key, not
yours. The sender (payer) intentionally calls it that way to compute the
*server's* receiving key:

```ts
// Sender side
const { publicKey } = await wallet.getPublicKey({
  protocolID: [2, '3241645161d8'],   // BRC-29 standard protocol id
  keyID: `${derivationPrefix} ${derivationSuffix}`,
  counterparty: serverIdentityKey,   // → returns server's derived key
});
```

The server, computing the same key from its side, **must** flip `forSelf`:

```ts
// Receiver / server side
const { publicKey } = await this.getPublicKey({
  protocolID: [2, '3241645161d8'],
  keyID: `${derivationPrefix} ${derivationSuffix}`,
  counterparty: senderIdentityKey,   // payer's identity from req.auth
  forSelf: true,                     // ← critical: derive MY key, not theirs
});
```

BRC-29 derivation is symmetric (BRC-42/43 ECDH), but the SDK helper is
*directional*. `forSelf: true` is the one bit that switches direction.

**Test:** locally compute both sides with a fixed prefix/suffix pair and
assert the addresses match.

---

## 3. Mount the auth middleware globally, not under `/api`

**Symptom:** Client's BRC-103 handshake gets `404 /.well-known/auth`.

**Cause:** `createAuthMiddleware` answers `POST /.well-known/auth` itself —
which is at the app root, not under your API prefix. If you mount it as
`app.use('/api/x402', authMw)`, the handshake never reaches it.

**Fix:** Mount it once at the app root with `allowUnauthenticated: true`:

```ts
app.use(getAuthMiddleware());     // root-level: handles /.well-known/auth
                                  // and stamps req.auth on every request
app.use('/api/x402', x402Router); // your protected routes use req.auth
```

In `allowUnauthenticated: true` mode the middleware is a transparent
pass-through for requests with no BSV headers — it simply sets
`req.auth = { identityKey: 'unknown' }`. Your protected routes then enforce
auth themselves with a small guard that 401s when `identityKey === 'unknown'`.

---

## 4. `.well-known/*` and SPA catch-all rewrites collide on the edge

**Symptom:** `GET /.well-known/x402-info` returns `<!doctype html>` (your SPA's
`index.html`) on the deployed site, even though it returns JSON locally.

**Cause:** If your web frontend is on the same domain and has a SPA fallback
rewrite (`/* → /index.html`), the deployment edge resolves
`/.well-known/auth` and `/.well-known/x402-info` against the SPA *before*
your API server sees them.

**Fix:** Two complementary moves:

1. **Provide a canonical alias under `/api/`.** Mount your discovery manifest
   at both `/.well-known/x402-info` (spec) and `/api/x402/info` (canonical
   fallback). When the well-known path gets intercepted, agents can fall back
   to the canonical one.
2. **Tell your edge router that `/.well-known/*` belongs to the API.** In
   Cloudflare Pages: `_routes.json` `include: ["/api/*", "/.well-known/*"]`.
   In Replit pnpm monorepos: add `/.well-known` to the api-server artifact's
   `paths` claim.

Document the canonical path in your manifest so clients can recover
automatically.

---

## 5. Never compute price from `req.path` string equality

**Symptom (silent):** A request to `/api/x402/analyze/` (trailing slash) or
`/api/x402/analyze?foo=bar` settles for **0 sats** because your price lookup
keyed off `req.path === endpoint.path` and missed.

**Cause:** Express normalises path matching for routing, but `req.path` can
contain trailing slashes / case differences / query encoding artefacts that
break exact string comparison. The default of an unmatched price calculator
is often `0`.

**Fix:** Bind the resolved endpoint object onto the request *before* the
payment middleware runs, and read it back in `calculateRequestPrice`:

```ts
// In your route stack:
//   requireAuthed → bindEndpoint(ep) → paymentMw → handler
function bindEndpoint(ep: Endpoint): RequestHandler {
  return (req, _res, next) => { req.x402Endpoint = ep; next(); };
}

createPaymentMiddleware({
  wallet,
  calculateRequestPrice: async (req) => {
    const ep = (req as any).x402Endpoint;
    if (!ep) throw new Error('endpoint not bound — refusing to price');
    return usdToSats(ep.usd);
  },
});
```

The throw is critical: returning `0` would let the request settle for free.

---

## 6. Verifying the output *value* — pass it via `AsyncLocalStorage`

**Symptom (silent):** The middleware sets `req.payment.satoshisPaid =
requestPrice` *unconditionally* — i.e. it trusts that the tx output pays the
right amount. A malicious payer can sign a tx that pays 1 satoshi and the
middleware will still hand off to your route as if they paid in full.

**Cause:** `internalizeAction` doesn't receive the required price as an
argument, and the wallet instance is shared across all routes.

**Fix:** Stash the required price in an `AsyncLocalStorage` context inside
`bindEndpoint`, then read it back inside `internalizeAction`:

```ts
// wallet.ts
export const x402PriceCtx =
  new AsyncLocalStorage<{ requiredSats: number }>();

class X402Wallet extends ProtoWallet {
  async internalizeAction(args) {
    const ctx = x402PriceCtx.getStore();
    if (!ctx) throw new Error('no price context — refusing to settle');
    const required = ctx.requiredSats;
    // ... after BRC-29 script check:
    if ((tx.outputs[i].satoshis ?? 0) < required) {
      throw new Error(`underpaid: ${satoshis} < ${required}`);
    }
  }
}

// route.ts
function bindEndpoint(ep): RequestHandler {
  return (req, _res, next) => {
    req.x402Endpoint = ep;
    usdToSats(ep.usd).then(requiredSats => {
      x402PriceCtx.run({ requiredSats }, () => next());
    }).catch(next);
  };
}
```

ALS context propagates through `await` chains, so the middleware's
`internalizeAction` call sees the same context.

---

## 7. Broadcast must fail-closed

**Symptom (silent):** The wallet returns `{accepted: true}` even when no miner
accepted the tx. A non-standard, double-spent, or otherwise unmineable tx
"pays" for service that never actually settles on-chain.

**Cause:** The natural pattern of "best-effort broadcast, log on failure" is
wrong for paywalls — broadcast failure is a payment failure.

**Fix:** Try multiple broadcasters (TAAL primary, GorillaPool fallback works
well in practice). If *all* of them reject the tx, throw from
`internalizeAction` so the middleware returns 4xx and your handler never
runs. Provide a single env-flag escape hatch (e.g. `X402_BROADCAST_OPTIONAL=1`)
for offline / regtest, but default to fail-closed in production.

```ts
const broadcasters = [
  new ARC('https://arc.taal.com',       process.env.TAAL_KEY),
  new ARC('https://arc.gorillapool.io', process.env.GP_KEY),
];

let ok = false;
const errs: string[] = [];
for (const arc of broadcasters) {
  try { await tx.broadcast(arc); ok = true; break; }
  catch (e) { errs.push((e as Error).message); }
}
if (!ok && process.env.X402_BROADCAST_OPTIONAL !== '1') {
  throw new Error(`tx ${tx.id('hex')} rejected by all broadcasters: ${errs.join(' | ')}`);
}
```

---

## 8. Hard-fail on missing or empty `outputs`

**Symptom (silent):** A payer sends `{outputs: []}` or omits the field; with no
outputs to verify, your loop is a no-op and the payment "succeeds".

**Fix:**

```ts
if (!Array.isArray(args.outputs) || args.outputs.length === 0) {
  throw new Error('no remittance outputs presented');
}
```

Same principle: the default behaviour of "iterate zero times and return ok"
is wrong on a paywall.

---

## 9. Discovery manifest — what agents actually need

Publish a JSON manifest that an autonomous agent can fetch unauthenticated
and use to plan its calls. At minimum:

```json
{
  "service": "your.domain",
  "protocol": "bsv-x402",
  "configured": true,
  "identity": "<server pubkey hex>",
  "address": "<receiving BSV address>",
  "usdPerBsv": 15.78,
  "endpoints": [
    {
      "key": "analyze",
      "method": "POST",
      "path": "/api/x402/analyze",
      "usd": 0.06,
      "satoshis": 380000,
      "input":  { "url": "string (https URL required)" },
      "output": { "brand": "BrandAnalysis JSON" }
    }
  ]
}
```

`configured: false` should be returned when `X402_SERVER_PRIVATE_KEY` is
unset, so agents can detect a misconfigured deploy without burning sats.

Serve at both `/.well-known/x402-info` (spec) and `/api/x402/info` (canonical,
edge-proof).

---

## 10. Recommended startup sanity check

On boot, log loudly when the wallet is unconfigured:

```
[x402] X402_SERVER_PRIVATE_KEY not set. Agent payment surface will be
disabled. Set this secret to enable BRC-103/104 auth + BRC-29/105 payments.
```

And when it is configured, log the address so you can eyeball it against
your manifest:

```
[x402] wallet initialized address=1JUKxhE97ptQdn4C7EZreVGUYgGDDGMLWq
```

If the address in the log doesn't match the address in `/api/x402/info`, you
have a config drift somewhere.

---

## Summary checklist

Before you ship a paid x402 surface, walk this list:

- [ ] Wallet implements `internalizeAction` (not just `ProtoWallet`).
- [ ] BRC-29 derivation uses `forSelf: true` on the receiver side.
- [ ] Auth middleware mounted at app root, not under `/api`.
- [ ] `/.well-known/*` reaches the API even with an SPA on the same domain.
- [ ] Canonical `/api/x402/info` discovery alias exists.
- [ ] Price lookup uses a bound endpoint object, never `req.path` strings.
- [ ] Output value is verified ≥ required sats (via ALS or equivalent).
- [ ] Broadcast failure fails the request (with a documented escape hatch).
- [ ] Empty / missing `outputs` array fails the request.
- [ ] Manifest exposes `configured: boolean` for agent self-diagnosis.
- [ ] Wallet address logged on boot.

Each of these caught us in production. Skip them at your peril.
