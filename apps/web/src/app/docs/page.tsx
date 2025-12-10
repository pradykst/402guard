"use client";

import React from 'react';
import { CodeBlock } from '@/components/CodeBlock';

export default function DocsPage() {
    return (
        <div className="max-w-4xl mx-auto py-10 space-y-12">

            {/* Intro */}
            <section className="space-y-6">
                <h1 className="text-4xl font-extrabold text-white">402Guard</h1>
                <p className="text-lg text-zinc-400 leading-relaxed">
                    402Guard is a TypeScript SDK that wraps any x402 enabled HTTP client with a policy engine, spend limits, and an on chain subscription registry on Avalanche Fuji.
                </p>
                <p className="text-lg text-zinc-400 leading-relaxed">
                    You keep using your normal HTTP client, your thirdweb x402 facilitator, and your existing API routes. 402Guard sits on top and decides:
                </p>
                <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                    <li>which agent is allowed to spend how much</li>
                    <li>which subscription is active</li>
                    <li>whether a given x402 quote should be paid or blocked</li>
                </ul>
                <p className="text-lg text-zinc-400 leading-relaxed">
                    Then it records usage and can generate invoices and simple analytics.
                </p>
                <p className="text-zinc-500 italic border-l-2 border-zinc-700 pl-4 py-2 bg-zinc-900/50 rounded-r">
                    This project was built for the Hack2Build: Payments x402 Hackathon and uses Avalanche Fuji Testnet, USDC, and thirdweb x402.
                </p>
            </section>

            <div className="w-full h-px bg-zinc-800" />

            {/* Architecture */}
            <section className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Architecture</h2>
                <p className="text-zinc-400">402Guard has three main pieces.</p>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">1. @402guard/client</h3>
                    <p className="text-zinc-400">Client side SDK that you use in frontends or backends:</p>
                    <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li><code className="text-blue-400">createGuardedClient</code> - policy engine and usage store</li>
                        <li><code className="text-blue-400">createGuardedAxios</code> - wraps an Axios instance and enforces policies</li>
                        <li>In memory usage store plus analytics helpers</li>
                        <li>Optional x402 hooks to handle 402 responses and do the payment retry</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">2. @402guard/subscriptions</h3>
                    <p className="text-zinc-400">Small on chain registry deployed on Avalanche Fuji:</p>
                    <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li>Solidity contract <code className="text-blue-400">Guard402Subscriptions</code></li>
                        <li>Functions to create plans, subscribe users, and record usage</li>
                        <li>Read helpers to check whether a given user is active on a plan</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">3. @402guard/server</h3>
                    <p className="text-zinc-400">Express helpers that plug the on chain subscription registry into API routes:</p>
                    <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                        <li><code className="text-blue-400">requireSubscription</code> middleware that checks <code className="text-blue-400">isSubscriptionActive</code></li>
                        <li>You put it in front of any premium endpoint</li>
                    </ul>
                </div>

                <p className="text-zinc-400">
                    The demo app in <code className="text-blue-400">apps/web</code> wires all three together and exposes two pages:
                </p>
                <ul className="list-disc pl-6 text-zinc-400 space-y-2">
                    <li><code className="text-blue-400">/x402-demo</code> - real x402 paid API call through thirdweb</li>
                    <li><code className="text-blue-400">/subscriptions-demo</code> - guarded HTTP calls with daily caps plus on chain status and invoice</li>
                </ul>
            </section>

            <div className="w-full h-px bg-zinc-800" />

            {/* Installation */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Installation</h2>
                <p className="text-zinc-400">In your own project you would install the packages from npm:</p>
                <CodeBlock code="npm install @402guard/client @402guard/subscriptions @402guard/server" language="bash" />
                <p className="text-zinc-400">For this monorepo the packages are already wired as workspace dependencies. From the repo root you can run:</p>
                <CodeBlock code={`bun install
bun run dev`} language="bash" />
                <p className="text-zinc-400">The Next app will be available on http://localhost:3000.</p>
            </section>

            {/* Quickstart */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Quickstart: guarded Axios without x402</h2>
                <p className="text-zinc-400">This is the simplest way to use the SDK. No x402 integration yet, just budgets around normal HTTP calls.</p>
                <CodeBlock code={`import { createGuardedAxios } from "@402guard/client";

const client = createGuardedAxios({
  agentId: "marketing-demo-user",
  policies: {
    globalDailyUsdCap: 5,
    perServiceCaps: {
      "api.openai.com": {
        dailyUsdCap: 2,
        monthlyUsdCap: 20,
      },
    },
  },
  // Very rough estimator for demo purposes
  estimateUsdForRequest: (config) => {
    if (config.url?.includes("/v1/chat/completions")) return 0.05;
    return 0.01;
  },
});

async function callApi() {
  const response = await client.guardedRequest({
    url: "https://api.openai.com/v1/chat/completions",
    method: "POST",
    data: { /* ... */ },
  });

  console.log(response.data);
}`} language="typescript" />
            </section>

            {/* x402 Integration */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white">x402 integration with thirdweb</h2>
                <p className="text-zinc-400">The x402 mode lets 402Guard intercept real 402 Payment Required responses, inspect the thirdweb quote, enforce budgets, and only then pay and retry.</p>

                <CodeBlock code={`import { createGuardedAxios } from "@402guard/client";
import { createThirdwebPayWithX402 } from "./thirdweb-x402-adapter";

const guarded = createGuardedAxios({
  agentId: "wallet-address-or-session-id",
  subscriptionId: "starter",
  facilitatorId: "thirdweb-fuji",
  policies: {
    globalDailyUsdCap: 5,
    perServiceCaps: {
      "localhost:3000": { dailyUsdCap: 1 },
    },
  },
  selectPaymentOption: (quote) => quote.options[0],
  estimateUsdFromQuote: (quote, option) => quote.amountUsd,
  payWithX402: createThirdwebPayWithX402({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
  }),
});

const res = await guarded.guardedRequest({
  url: "/api/x402-thirdweb-demo",
  method: "GET",
});`} language="typescript" />
            </section>

        </div>
    );
}
