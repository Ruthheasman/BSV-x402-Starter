# BSV x402 API Integration Prompt

Use this prompt when building other apps that need to call this API. Replace `[YOUR_PUBLISHED_URL]` with your actual published URL.

---

This app needs to call a BSV x402 micropayment API. The API is hosted at `[YOUR_PUBLISHED_URL]` and uses BRC-103/104 mutual authentication and BRC-29/105 micropayments via HTTP 402.

**How it works:**
1. The API's discovery endpoint is at `GET /.well-known/x402-info` — it returns all available endpoints, their prices in satoshis, accepted inputs, and response formats.
2. Every paid request requires BSV authentication headers (BRC-103/104) and a BSV payment transaction (BRC-29/105) included in the request.
3. If payment is insufficient or missing, the server responds with HTTP 402 and the required price.
4. If the handler fails after payment, the payment is automatically refunded.

**Client integration:**
- Use `@bsv/sdk` for wallet/key management and `@bsv/auth-fetch` as a drop-in replacement for `fetch` that handles signing and payment automatically.
- The client needs its own BSV private key (stored as a secret) to sign requests and fund payments.
- First call the discovery endpoint to learn available endpoints and prices, then make authenticated paid requests.

**Example pattern:**
```typescript
import { ProtoWallet, PrivateKey } from '@bsv/sdk'

const clientKey = PrivateKey.fromWif(process.env.CLIENT_BSV_KEY)
const wallet = new ProtoWallet(clientKey)

// 1. Discover endpoints
const discovery = await fetch('[YOUR_PUBLISHED_URL]/.well-known/x402-info').then(r => r.json())

// 2. Make authenticated + paid requests using @bsv/auth-fetch
```

**Important:** The response can be any content type (JSON, PDF, zip, etc.) depending on the endpoint. Check the discovery manifest for each endpoint's `returns.contentType` to handle responses correctly.
