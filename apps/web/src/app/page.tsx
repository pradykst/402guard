"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CodeBlock } from "@/components/CodeBlock";

export default function Home() {
  return (
    <div className="flex flex-col gap-20 py-10">
      {/* Hero Section */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
            Guardrails for <span className="text-blue-500">x402</span> payments and subscriptions on Avalanche
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            402Guard is a TypeScript SDK that wraps x402 clients with spend limits, rate limits, usage analytics, and on chain subscription checks. You keep your existing HTTP client and facilitators. We handle the policies.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/x402-demo">
              <Button size="lg" className="w-full sm:w-auto">Run x402 Demo</Button>
            </Link>
            <Link href="/subscriptions-demo">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">View Subscriptions Demo</Button>
            </Link>
            <Link href="https://github.com/pradykst/402guard" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto">View on GitHub</Button>
            </Link>
          </div>
        </div>
        <div className="w-full">
          <CodeBlock
            title="quickstart.ts"
            code={`import { createGuardedAxios } from "@402guard/client";

const client = createGuardedAxios({
  agentId: "marketing-page-demo",
  policies: {
    globalDailyUsdCap: 5,
    perServiceCaps: {
      "api.thirdweb.com": { dailyUsdCap: 1 },
    },
  },
});

const res = await client.guardedRequest({
  url: "https://api.thirdweb.com/x402/paid-endpoint",
  method: "GET",
});`}
          />
        </div>
      </section>

      {/* Why 402Guard */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-10 text-center">Why 402Guard?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card title="Guard your x402 spend">
            <p className="text-zinc-400">
              Set exact daily or global caps in USD. Stop running up bills on paid APIs accidentally.
            </p>
          </Card>
          <Card title="On chain subscriptions">
            <p className="text-zinc-400">
              Enforce access control based on active on-chain subscriptions on Avalanche Fuji.
            </p>
          </Card>
          <Card title="Invoices and analytics">
            <p className="text-zinc-400">
              Track every paid request. Download generic PDF/JSON invoices for your accounting.
            </p>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <CodeBlock
            title="Under the hood"
            code={`// Pseudo-flow of policy enforcement
if (policy.isRateLimited(user)) throw new Error("Rate limit");
 
if (subscription.required) {
  const active = await chain.isActive(user.address);
  if (!active) throw new Error("Subscription inactive");
}

const quote = await x402.getQuote(url);
if (quote.cost > policy.remainingBudget) {
   throw new Error("Budget exceeded");
}

await x402.pay(quote);
await analytics.record(quote);`}
          />
        </div>
        <div className="flex flex-col gap-8 order-1 lg:order-2">
          <h2 className="text-3xl font-bold text-white">How it works</h2>
          <div className="space-y-6">
            {[
              "Deploy Guard402Subscriptions on Avalanche Fuji",
              "Wrap your x402 client with createGuardedAxios and configure budgets",
              "Expose your paid API endpoint via thirdweb x402 and let 402Guard enforce policies"
            ].map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold border border-blue-600/30">
                  {i + 1}
                </div>
                <p className="text-zinc-300 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Tabs */}
      <section className="pb-10">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Integration Examples</h2>
        <CodeTabs />
      </section>
    </div>
  );
}

function CodeTabs() {
  const [activeTab, setActiveTab] = useState<'client' | 'server' | 'chain'>('client');

  const content = {
    client: {
      title: 'client.ts',
      code: `// Client-side usage with React hooks
const { client } = useGuardedClient();

const fetchData = async () => {
   // Automatically handles 402 Payment Required
   // Checks local policies before sending
   const data = await client.get("/api/data");
   return data;
}`
    },
    server: {
      title: 'middleware.ts',
      code: `// Server-side Express middleware
import { requireSubscription } from "@402guard/server";

app.use("/api/premium", requireSubscription({
   chain: "avalanche-fuji",
   contract: "0x123...",
   minTier: 1
}));`
    },
    chain: {
      title: 'Guard402.sol',
      code: `// On-chain subscription validation
function isSubscriptionActive(address user) public view returns (bool) {
    Subscription memory sub = subscriptions[user];
    return sub.expiration > block.timestamp;
}

function recordUsage(address user, uint256 amount) external onlyRelayer {
    usage[user] += amount;
}`
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-6">
        <div className="bg-zinc-900 p-1 rounded-lg inline-flex border border-zinc-800">
          {(['client', 'server', 'chain'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <CodeBlock
        title={content[activeTab].title}
        code={content[activeTab].code}
      />
    </div>
  );
}
