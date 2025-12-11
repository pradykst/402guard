
import React from 'react';
import type { UsageContext } from "@402guard/client";

// --- Sample Data ---

const sampleUsage: UsageContext[] = [
    {
        serviceId: "x402-demo",
        agentId: "frontend-demo",
        subscriptionId: "demo-plan",
        usdAmount: 0.01,
        timestamp: new Date("2025-12-10T10:00:00Z"),
        x402: {
            facilitatorId: "thirdweb",
            network: "avalanche-fuji",
            asset: "USDC",
            transaction: "0x1234567890abcdef1234567890abcdef12345678",
        },
    },
    {
        serviceId: "x402-demo",
        agentId: "frontend-demo",
        subscriptionId: "demo-plan",
        usdAmount: 0.02,
        timestamp: new Date("2025-12-10T10:05:00Z"),
        x402: {
            facilitatorId: "thirdweb",
            network: "avalanche-fuji",
            asset: "USDC",
            transaction: "0xabcdef1234567890abcdef1234567890abcdef12",
        },
    },
    {
        serviceId: "x402-demo",
        agentId: "backend-bot",
        subscriptionId: "pro-plan",
        usdAmount: 0.05,
        timestamp: new Date("2025-12-10T10:15:00Z"),
        x402: {
            facilitatorId: "thirdweb",
            network: "avalanche-fuji",
            asset: "USDC",
            transaction: "0x9876543210fedcba9876543210fedcba98765432",
        },
    },
    {
        serviceId: "x402-demo",
        agentId: "frontend-demo",
        subscriptionId: "demo-plan",
        usdAmount: 0.00,
        timestamp: new Date("2025-12-10T10:20:00Z"),
        // Simulate a blocked request (no transaction, 0 cost or captured elsewhere)
        // The user prompt implies blocked requests might be in this list or we should infer them.
        // For blocked requests, usually usdAmount might be 0 or the attempted amount.
        // Let's assume we flag it in metadata or just infer from usdAmount=0 for this demo if needed, 
        // BUT the prompt says "blocked vs allowed rate".
        // I will add a custom property for the demo logic or just assume 0 amount = blocked for simplify 
        // OR better, I will extend the mock data structure slightly for the UI if needed, 
        // but the prompt says "Use UsageContext". UsageContext doesn't have "status".
        // Wait, the prompt says "allowed / blocked decision" in the list of things to show. 
        // But UsageContext is what is PASSED to the store strictly speaking.
        // I will add a field `status` to my local type which extends UsageContext for the demo.
    } as any, // casting to allow extra properties for the demo visualization
    {
        serviceId: "weather-api",
        agentId: "scraper-bot",
        subscriptionId: "basic-plan",
        usdAmount: 0.00,
        timestamp: new Date("2025-12-10T11:00:00Z"),
        status: "blocked", // Demo property
        x402: {
            facilitatorId: "thirdweb",
            network: "avalanche-fuji",
            asset: "USDC",
        }
    } as any,
    {
        serviceId: "x402-demo",
        agentId: "frontend-demo",
        subscriptionId: "demo-plan",
        usdAmount: 0.01,
        timestamp: new Date("2025-12-10T11:05:00Z"),
        x402: {
            facilitatorId: "thirdweb",
            network: "avalanche-fuji",
            asset: "USDC",
            transaction: "0x1111222233334444555566667777888899990000",
        },
    },
    {
        serviceId: "weather-api",
        agentId: "ios-app",
        subscriptionId: "pro-plan",
        usdAmount: 0.10,
        timestamp: new Date("2025-12-10T12:00:00Z"),
        x402: {
            facilitatorId: "thirdweb",
            network: "avalanche-fuji",
            asset: "USDC",
            transaction: "0xaaaabbbbccccddddeeeeffff0000111122223333",
        },
    },
];

// Enrich sample data with explicit status for the demo if not present
const enrichedUsage = sampleUsage.map(u => ({
    ...u,
    // If explicitly marked or if usdAmount > 0 we assume allowed, else blocked for this demo context
    status: (u as any).status || (u.usdAmount > 0 ? "allowed" : "blocked"),
    // Mock transaction info if missing for blocked?
    transactionHash: u.x402?.transaction,
}));


// --- Helpers ---

function computeStats(data: typeof enrichedUsage) {
    const totalSpend = data.reduce((acc, curr) => acc + curr.usdAmount, 0);
    const totalRequests = data.length;
    const blockedCount = data.filter(d => d.status === 'blocked').length;
    const allowedCount = totalRequests - blockedCount;
    const blockRate = totalRequests > 0 ? (blockedCount / totalRequests) * 100 : 0;

    const bySubscription: Record<string, { totalSpend: number; requests: number }> = {};
    const byAgent: Record<string, { totalSpend: number; requests: number }> = {};

    data.forEach(d => {
        // Subscription
        const subId = d.subscriptionId || "unknown";
        if (!bySubscription[subId]) {
            bySubscription[subId] = { totalSpend: 0, requests: 0 };
        }
        bySubscription[subId].totalSpend += d.usdAmount;
        bySubscription[subId].requests += 1;

        // Agent
        const agId = d.agentId || "unknown";
        if (!byAgent[agId]) {
            byAgent[agId] = { totalSpend: 0, requests: 0 };
        }
        byAgent[agId].totalSpend += d.usdAmount;
        byAgent[agId].requests += 1;
    });

    return {
        totalSpend,
        totalRequests,
        blockedCount,
        allowedCount,
        blockRate,
        bySubscription,
        byAgent
    };
}

export default function AnalyticsPage() {
    const stats = computeStats(enrichedUsage);

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="space-y-4">
                <h1 className="text-4xl font-bold text-white tracking-tight">Analytics</h1>
                <p className="text-xl text-zinc-400 max-w-3xl">
                    See how 402Guard tracks spend per subscription, per agent, and per API, so you can keep budgets under control.
                </p>
            </section>

            {/* Summary Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Session Spend</div>
                    <div className="text-3xl font-mono text-white">${stats.totalSpend.toFixed(2)}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Requests</div>
                    <div className="text-3xl font-mono text-white">{stats.totalRequests}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Blocked / Allowed</div>
                    <div className="text-3xl font-mono text-white">
                        <span className="text-red-400">{stats.blockedCount}</span>
                        <span className="text-zinc-600 mx-2">/</span>
                        <span className="text-green-400">{stats.allowedCount}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                        Block Rate: {stats.blockRate.toFixed(1)}%
                    </div>
                </div>
            </section>

            {/* Breakdowns */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* By Subscription */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">By Subscription</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="pb-3 font-medium text-zinc-400">Subscription ID</th>
                                    <th className="pb-3 font-medium text-zinc-400 text-right">Requests</th>
                                    <th className="pb-3 font-medium text-zinc-400 text-right">Total Spend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {Object.entries(stats.bySubscription).map(([id, data]) => (
                                    <tr key={id} className="group">
                                        <td className="py-3 font-mono text-zinc-300">{id}</td>
                                        <td className="py-3 text-right text-zinc-400">{data.requests}</td>
                                        <td className="py-3 text-right text-white font-mono">${data.totalSpend.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* By Agent */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">By Agent</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="pb-3 font-medium text-zinc-400">Agent ID</th>
                                    <th className="pb-3 font-medium text-zinc-400 text-right">Requests</th>
                                    <th className="pb-3 font-medium text-zinc-400 text-right">Total Spend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {Object.entries(stats.byAgent).map(([id, data]) => (
                                    <tr key={id} className="group">
                                        <td className="py-3 font-mono text-zinc-300">{id}</td>
                                        <td className="py-3 text-right text-zinc-400">{data.requests}</td>
                                        <td className="py-3 text-right text-white font-mono">${data.totalSpend.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Recent Requests */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-neutral-800">
                    <h3 className="text-lg font-bold text-white">Recent Requests</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-950/50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Time</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Service</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Subscription</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Agent</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Amount</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Status</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Network</th>
                                <th className="px-6 py-3 font-medium text-zinc-400 whitespace-nowrap">Tx Hash</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {enrichedUsage.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map((u, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-3 text-zinc-400 whitespace-nowrap">
                                        {u.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-3 text-zinc-300">{u.serviceId}</td>
                                    <td className="px-6 py-3 text-zinc-300">{u.subscriptionId}</td>
                                    <td className="px-6 py-3 text-zinc-300 font-mono text-xs">{u.agentId}</td>
                                    <td className="px-6 py-3 text-white font-mono">${u.usdAmount.toFixed(2)}</td>
                                    <td className="px-6 py-3 font-medium">
                                        {u.status === 'allowed' ? (
                                            <span className="text-green-400 inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Allowed
                                            </span>
                                        ) : (
                                            <span className="text-red-400 inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Blocked
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-zinc-400 text-xs">{u.x402?.network || '-'} / {u.x402?.asset || '-'}</td>
                                    <td className="px-6 py-3 font-mono text-xs text-blue-400 hover:text-blue-300">
                                        {u.transactionHash ? (
                                            <a href="#" className="underline decoration-dotted underline-offset-2">
                                                {u.transactionHash.slice(0, 6)}...{u.transactionHash.slice(-4)}
                                            </a>
                                        ) : (
                                            <span className="text-zinc-600">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Developer Guide */}
            <section className="pt-12 border-t border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-8">Plug in your own analytics backend</h2>

                <div className="space-y-12">
                    {/* Step 1 */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-400">1. Implement the UsageStore Interface</h3>
                        <p className="text-zinc-400">
                            To persist analytics, create a class that implements <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded text-sm">UsageStore</code> from <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded text-sm">@402guard/client</code>.
                            Your <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded text-sm">recordUsage</code> method will need to insert data into your database.
                        </p>
                        <div className="bg-[#0c0c0c] border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-zinc-300">
                                {`import { type UsageStore, type UsageContext } from "@402guard/client";

export class PostgresUsageStore implements UsageStore {
  async recordUsage(ctx: UsageContext): Promise<void> {
    // Insert into your database
    await db.query(
      \`INSERT INTO usage_logs (service_id, agent_id, usd_amount, tx_hash, created_at)
       VALUES ($1, $2, $3, $4, $5)\`,
      [ctx.serviceId, ctx.agentId, ctx.usdAmount, ctx.x402.transaction, ctx.timestamp]
    );
  }
  
  // Implement other methods for budget tracking...
}`}
                            </pre>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-400">2. Aggregate Spend Data</h3>
                        <p className="text-zinc-400">
                            Write simple SQL queries or aggregation pipelines to power your dashboard.
                        </p>
                        <div className="bg-[#0c0c0c] border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-zinc-300">
                                {`-- Total spend by subscription
SELECT subscription_id, SUM(usd_amount) as total_spend, COUNT(*) as requests
FROM usage_logs
GROUP BY subscription_id;

-- Total spend by agent
SELECT agent_id, SUM(usd_amount) as total_spend, COUNT(*) as requests
FROM usage_logs
GROUP BY agent_id;`}
                            </pre>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-400">3. Connect to the Guarded Client</h3>
                        <p className="text-zinc-400">
                            Pass your custom store instance when creating the guarded client.
                        </p>
                        <div className="bg-[#0c0c0c] border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-zinc-300">
                                {`import { createGuardedAxios } from "@402guard/client";
import { PostgresUsageStore } from "./your-store";

const guarded = createGuardedAxios({
  store: new PostgresUsageStore(), // Your DB-backed store
  policies: { 
    budgets: [
       { id: "monthly-limit", maxUsdCents: 5000, windowMs: 2592000000, scope: { subscriptionId: "pro-plan" } }
    ] 
  },
});

// Now every request is logged to your DB!`}
                            </pre>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
