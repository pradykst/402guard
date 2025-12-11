# 402Guard · Guardrails for x402 on Avalanche

402Guard is a TypeScript SDK that wraps x402 clients with a policy engine and a simple subscription layer on Avalanche.  
You add one import, and your x402 calls gain spend limits, rate limits, usage quotas, subscription checks and invoices.

Built for the **Avalanche x402 Hack2Build – Payments (Tooling & Infrastructure)** track.

---
<img width="2752" height="1536" alt="Gemini_Generated_Image_hcmhgihcmhgihcmh" src="https://github.com/user-attachments/assets/d730d593-cf66-4866-8dfe-c9fad17e2a2f" />



## Why 402Guard

x402 solves how to pay for APIs over HTTP with on-chain settlement.  
What it does not solve is **who is allowed to spend how much and under what rules**.

If an AI agent or backend loop goes wrong, it can drain a wallet through valid x402 payments.  
Teams also still need classic SaaS primitives like monthly plans, per-seat limits and usage-based tiers.

402Guard focuses on that missing safety and finance ops layer.

- Keep using your existing x402 helpers.
- Wrap them with 402Guard.
- Get budgets, quotas, subscriptions and invoices without re-implementing payments or smart contracts.

---

## Features

### Guarded HTTP clients

- Drop-in wrappers for `axios` and `fetch` that understand x402.
- Intercept `402 Payment Required` responses and handle payment, retry and logging.
- Enforce local spend and rate limits **before** signing any payment request.
- Works with plain 200 flows and x402 flows through the same interface.

### Policy engine

- Global daily and monthly spend caps per wallet or agent.
- Per-service and per-endpoint budgets and request rates.
- Simple estimation hook: `estimateUsdForRequest(config)`.
- Soft and hard thresholds with room for future alert hooks or webhooks.

### Subscription toolkit on Avalanche

- Minimal Solidity contract `Guard402Subscriptions.sol` that tracks:
  - subscription plans (plan id, price, caps, metadata)
  - active subscribers (address, plan, expiry)
- TypeScript wrapper that exposes:
  - `createPlan`, `updatePlan`
  - `subscribe`, `cancel`
  - `isActive`, `getPlan`
- Ready to back **usage-based subscriptions** where the on-chain plan is the source of truth and 402Guard is the local policy and analytics brain.

### Pluggable usage storage

- In-memory store for quick experiments and tests.
- File or SQLite backed store for small production setups.
- Simple `UsageStore` interface so you can plug in Postgres, Redis or any internal billing database.
- Helpers to aggregate spend by service, agent and subscription.

### Avalanche first

- Network helpers wired for **Avalanche Fuji** testnet.
- Contract deployment scripts using **Foundry**.
- Designed to work with Avalanche-compatible x402 facilitators (example: thirdweb in the final demo).

### Extra selling points

- Policy engine that works across many merchants, not just one endpoint.
- Subscription registry plus invoices that are on-chain anchored but still app-friendly.
- Self-hosted analytics pages that any team can run next to their agents and APIs.

---

## High-level architecture

402Guard is split into small packages so you can adopt only what you need.

- **`@402guard/client`**  
  Guarded HTTP clients and the policy engine. Wraps an axios instance and x402 helpers.

- **`@402guard/subscriptions`**  
  Solidity subscription contract plus TypeScript bindings and helpers to talk to it.

- **`@402guard/server`** *(planned)*  
  Express middlewares and helpers to build x402-enabled APIs with subscription checks on the server side.

### A typical setup

1. Provider deploys `Guard402Subscriptions` on Avalanche Fuji.
2. Provider protects premium endpoints with a subscription check on the server side.
3. Client wraps its x402-aware HTTP client with `createGuardedAxios`.
4. When the provider responds with HTTP 402, 402Guard:
   - checks policies and subscription state
   - calls a facilitator if allowed
   - retries the request with x402 payment headers
5. All usage is recorded in a `UsageStore` and visible through invoices and summaries.

---

## Monorepo layout

```text
402guard/
  apps/
    web/                     # Next.js demo app
      src/app/200/           # Simple capped axios demo
      src/app/x402-demo/     # x402 quote + payment + retry demo
      src/app/subscriptions-demo/  # subscription caps + invoice demo
  packages/
    client/                  # @402guard/client
      src/policies.ts
      src/store.ts
      src/analytics.ts
      src/x402.ts
    subscriptions/           # @402guard/subscriptions
      src/chain.ts           # viem based contract wrapper
      src/index.ts           # helpers + invoice generator
  contracts/
    guard402-subscriptions/  # Foundry project for Guard402Subscriptions.sol
      src/Guard402Subscriptions.sol
      script/Deploy.s.sol
```

---

## Getting started

### 1. Install dependencies

From the repo root:

```bash
# install workspace dependencies
bun install
# or
npm install
```

For contracts you also need Foundry:

```bash
# if you do not have foundryup yet
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Configure environment

Create a `.env` file at the repo root:

```bash
# Avalanche Fuji RPC (public RPC works for testing)
AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc

# optional, only if you want contract verification
SNOWTRACE_API_KEY=your_key_here
```

For script-based deployment you also need a private key (test key only):

```bash
# never put a real mainnet key here
DEPLOYER_PRIVATE_KEY=0xabc123...
```

### 3. Deploy the subscription contract on Fuji

Inside the contracts folder:

```bash
cd contracts/guard402-subscriptions

# install dependencies (openzeppelin, forge-std)
forge install

# check that compilation works
forge build

# deploy to Fuji using the rpc alias from foundry.toml
forge script script/Deploy.s.sol \
  --rpc-url fuji \
  --broadcast
```

The script will print the `Guard402Subscriptions` address.
Copy that into `packages/subscriptions/src/Guard402Subscriptions.json` (or your config file).

### 4. Run the demo app

From the repo root:

```bash
cd apps/web
bun dev
# or
npm run dev
```

Then open:

- `http://localhost:3000/200` – basic capped axios demo
- `http://localhost:3000/x402-demo` – x402 402→pay→200 flow with CSV invoice
- `http://localhost:3000/subscriptions-demo` – subscription plans, daily caps and JSON invoices

---

## Using @402guard/client in your own app

### Wrap axios with 402Guard

```typescript
import axios from "axios";
import { createGuardedAxios } from "@402guard/client";

const axiosInstance = axios.create();

const http = createGuardedAxios({
  axiosInstance,
  agentId: "my-agent-1",
  policies: {
    services: {
      "api.myservice.com": {
        dailyUsdCap: 5.0,     // at most 5 USD per day for this service
      },
    },
    global: {
      monthlyUsdCap: 100.0,   // optional global cap
    },
  },
  // very simple estimator for the demo
  estimateUsdForRequest: () => 0.01,
});
```

### Make guarded requests

```typescript
async function fetchProfile() {
  const res = await http.guardedRequest({
    url: "https://api.myservice.com/profile",
    method: "GET",
  });

  console.log(res.data);
}
```

If the caps are exceeded, `guardedRequest` throws an error with a `guard402` field:

```typescript
try {
  await fetchProfile();
} catch (err: any) {
  if (err.guard402) {
    console.error("Blocked by 402Guard:", err.guard402.reason);
  } else {
    console.error("Network error:", err);
  }
}
```

### x402 (402 Payment Required) flows

To use x402, you plug your existing facilitator hooks into 402Guard.

```typescript
import {
  pickFirstOption,
  estimateUsdFromQuote,
  payWithX402Local,   // or your real facilitator wrapper
} from "@402guard/client";

const x402Http = createGuardedAxios({
  agentId: "x402-demo-agent",
  policies: {
    services: {
      "my-x402-api.com": {
        dailyUsdCap: 1.0,    // 1 USD per day
      },
    },
  },
  estimateUsdForRequest: undefined,   // price comes from x402 quote
  facilitatorId: "thirdweb-demo",
  selectPaymentOption: pickFirstOption,
  estimateUsdFromQuote,
  payWithX402: payWithX402Local,      // replace with real thirdweb integration
});

async function callPaidEndpoint() {
  const res = await x402Http.guardedRequest({
    url: "https://my-x402-api.com/endpoint",
    method: "GET",
  });

  console.log(res.data);
}
```

The client:

1. Sends the request.
2. Receives HTTP 402 plus an x402 quote.
3. Checks local caps.
4. Calls the facilitator.
5. Retries the request with payment headers.
6. Records usage in the UsageStore.

---

## Subscriptions and invoices

The subscription contract lives on Avalanche and tracks which address is on which plan and until when.
402Guard then applies additional caps per subscription id on top of the raw wallet-based policies.

### Client-side subscription usage

```typescript
import {
  createSubscriptionAxios,
  generateInvoice,
} from "@402guard/subscriptions";

const client = createSubscriptionAxios({
  subscriptionId: "sub-starter",      // logical id for this user or team
  policies: {
    global: {
      dailyUsdCap: 0.03,              // 3 calls at 0.01 USD
    },
  },
  estimateUsdForRequest: () => 0.01,
});

await client.guardedRequest({
  url: "https://jsonplaceholder.typicode.com/todos/1",
  method: "GET",
});
```

### Generate a JSON invoice

```typescript
import type { UsageStore } from "@402guard/client";

const store = client.guard.store as UsageStore;

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const todayEnd = new Date();
todayEnd.setHours(23, 59, 59, 999);

const invoice = generateInvoice({
  store,
  subscriptionId: "sub-starter",
  periodStart: todayStart,
  periodEnd: todayEnd,
});

console.log(JSON.stringify(invoice, null, 2));
```

The `subscriptions-demo` page in the Next.js app does exactly this and exposes a **Download invoice (today)** button.

---

## Roadmap

Planned extensions after the hackathon window:

- Real facilitator integration with thirdweb for Avalanche x402.
- `@402guard/server` Express and NestJS middlewares.
- Postgres-backed UsageStore and a small dashboard service.
- Email or webhook alerts for soft and hard policy thresholds.
- More subscription shapes:
  - per-seat
  - prepaid packages
  - trial plans with time and usage caps
- Automated tests and CI pipeline for the monorepo.

---

## License

MIT
