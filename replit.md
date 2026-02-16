# BSV x402 Micropayment API Starter

## Overview
A one-click Replit template for shipping production APIs with BSV micropayments. Fork it, set your private key, define endpoints and prices, deploy. AI agents can discover, authenticate against, pay, and consume your API autonomously.

## Architecture
- **Runtime**: Node.js 20+ with TypeScript
- **Server**: Express with BSV auth + payment middleware chain
- **Auth**: `@bsv/auth-express-middleware` (BRC-103/104 mutual authentication)
- **Payments**: `@bsv/payment-express-middleware` (BRC-29/105 micropayments via HTTP 402)
- **Wallet**: `@bsv/sdk` (key derivation, transaction handling)
- **Frontend**: Vite + React dashboard showing endpoints, pricing, and status
- **Deployment**: Replit (primary), portable to any Node host

## Project Structure
```
server/
  index.ts          - Express app entry point
  routes.ts         - API routes wiring (discovery, status, paid endpoints)
  config.ts         - Endpoint definitions + pricing (THE file to edit)
  wallet.ts         - BSV wallet initialization from SERVER_PRIVATE_KEY
  middleware/
    payment-setup.ts - Auth + payment middleware wiring
  services/
    example.ts      - Example endpoint handlers (demo responses)
  vite.ts           - Vite dev server setup (DO NOT MODIFY)
  static.ts         - Production static file serving
client/
  src/
    App.tsx         - App root with routing
    pages/
      dashboard.tsx - Main dashboard page
    components/
      theme-provider.tsx - Dark/light theme
      theme-toggle.tsx   - Theme toggle button
shared/
  schema.ts         - Shared TypeScript types and helpers
```

## Key Files
- **server/config.ts** - Define all API endpoints and prices here. This is the main file developers customize.
- **server/services/example.ts** - Example handlers. Replace with real business logic.
- **server/wallet.ts** - Wallet initialization from SERVER_PRIVATE_KEY env var.
- **server/middleware/payment-setup.ts** - BSV auth + payment middleware chain.

## Environment Variables
- `SERVER_PRIVATE_KEY` - BSV private key (hex-encoded or WIF format) for wallet (optional, runs in demo mode without it)
- `ADMIN_PASSWORD` - Password for accessing the /admin dashboard (optional, admin is open without it)
- `SERVICE_NAME` - Custom service name (default: "bsv-x402-starter")

## How It Works
1. Client hits `/.well-known/x402-info` for discovery
2. Auth middleware (BRC-103/104) handles mutual authentication
3. Payment middleware returns HTTP 402 with price for paid endpoints
4. Client pays in BSV via x-bsv-payment header
5. Server verifies payment and serves response

## Running
`npm run dev` starts both the Express backend and Vite frontend on port 5000.

## Pages
- `/` - Main dashboard with hero, stats, endpoint cards, payment flow visualization, architecture diagram, quickstart
- `/guide` - Integration guide: 6-step walkthrough for adding BSV payments to existing apps

## Recent Changes
- Initial implementation: Feb 2026
- BSV auth + payment middleware with config-driven pricing
- Dashboard with endpoint cards, payment flow, architecture visualization
- Discovery endpoint at /.well-known/x402-info
- Example endpoints across 3 pricing tiers (micro, standard, premium)
- Integration guide page at /guide
- Wallet supports both hex-encoded and WIF format private keys
