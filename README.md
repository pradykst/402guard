# 402Guard · Guardrails for x402 on Avalanche

402Guard is a TypeScript SDK that wraps x402 clients with a policy engine and a simple subscription system on Avalanche.  
You add one import and your x402 calls gain spend limits, rate limits, usage quotas and subscription checks.

Built for the Avalanche x402 Hack2Build Payments track (Tooling and Infrastructure).

---

## Why 402Guard

x402 solves how to pay for APIs over HTTP with onchain settlement.  
What it does not solve is who is allowed to spend how much and under what rules.

If an AI agent or backend loop goes wrong, it can drain a wallet through valid x402 payments.  
Teams also still need classic subscription offerings like monthly plans and usage based tiers.

402Guard focuses on that missing safety and finance ops layer.

- Keep using your existing x402 helpers.
- Wrap them with 402Guard.
- Get budgets, quotas and subscriptions without re implementing payments or smart contracts.

---

## Key features

**Guarded HTTP clients**

- Drop in wrappers for `axios` and `fetch` that speak x402.
- Intercept `402 Payment Required` responses and handle payment, retry and logging.
- Enforce spend and rate limits before signing any payment.

**Policy engine**

- Global daily and monthly spend caps per wallet or agent.
- Per service and per endpoint budgets and request rates.
- Soft and hard thresholds with hooks for alerts.

**Subscription toolkit on Avalanche**

- Minimal Solidity contract that tracks subscription plans and active subscribers.
- TypeScript wrapper that exposes `createPlan`, `subscribe`, `isActive` and `recordUsage`.
- Express middleware that checks subscriptions before serving premium resources.

**Pluggable usage storage**

- In memory store for quick experiments.
- SQLite store for small production setups.
- Interfaces ready for Postgres or Redis backends.

**Avalanche first**

- Preconfigured networks for Avalanche Fuji and C Chain.
- Ready to plug in Avalanche compatible x402 facilitators.

---

## High level architecture

402Guard is split into small packages so you can adopt only what you need.

- `@402guard/client`  
  Guarded HTTP clients and the policy engine. Wraps `x402-axios` or similar helpers.

- `@402guard/subscriptions`  
  Solidity contract plus TypeScript bindings for subscription plans on Avalanche.

- `@402guard/server`  
  Express middlewares and helpers to build x402 enabled APIs with subscription checks.

A typical setup:

1. Provider deploys `Guard402Subscription` contract on Avalanche Fuji.
2. Provider protects premium endpoints with `requireSubscription`.
3. Client wraps its x402 aware HTTP client with `createGuardedAxios`.
4. When the provider responds with 402, 402Guard pays through the facilitator only if policies allow it.
5. All usage is recorded and visible through the storage backend and logs.

---

## Quickstart

### 1. Install

```bash
# client side
npm install @402guard/client x402-axios

# server side
npm install @402guard/server @402guard/subscriptions
