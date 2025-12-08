"use client";

import { useMemo, useState } from "react";
import {
    getSubscriptionSpendSummary,
    type UsageStore,
} from "@402guard/client";
import {
    createSubscriptionAxios,
    generateInvoice,
    type Invoice,
} from "@402guard/subscriptions";


type PlanId = "starter" | "pro";

const PLANS: Record<
    PlanId,
    { label: string; dailyCap: number; subscriptionId: string }
> = {
    starter: {
        label: "Starter • $0.03/day cap",
        dailyCap: 0.03,
        subscriptionId: "sub-starter",
    },
    pro: {
        label: "Pro • $0.10/day cap",
        dailyCap: 0.1,
        subscriptionId: "sub-pro",
    },
};

// cache: one guarded client per plan
const clientsByPlan: Partial<
    Record<PlanId, ReturnType<typeof createSubscriptionAxios>>
> = {};

function getClientForPlan(plan: PlanId) {
    if (clientsByPlan[plan]) return clientsByPlan[plan]!;

    const cfg = PLANS[plan];

    const client = createSubscriptionAxios({
        subscriptionId: cfg.subscriptionId,
        policies: {
            // cap is per subscription (we used global cap here for simplicity)
            global: {
                dailyUsdCap: cfg.dailyCap,
            },
        },
        // reuse our “each call costs $0.01” mental model
        estimateUsdForRequest: () => 0.01,
    });

    clientsByPlan[plan] = client;
    return client;
}


export default function SubscriptionsDemoPage() {
    const [plan, setPlan] = useState<PlanId>("starter");
    const [logs, setLogs] = useState<string[]>([]);
    const [blocked, setBlocked] = useState(false);
    const [callCount, setCallCount] = useState(0);
    const [subSummary, setSubSummary] = useState<
        ReturnType<typeof getSubscriptionSpendSummary>
    >([]);
    const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

    // whenever plan changes, we use the corresponding guarded client
    const client = useMemo(() => getClientForPlan(plan), [plan]);
    async function handleCall() {
        if (blocked) return;

        const nextCall = callCount + 1;
        setLogs(prev => [...prev, `Call ${nextCall}: starting...`]);

        try {
            const res = await client.guardedRequest({
                url: "https://jsonplaceholder.typicode.com/todos/1",
                method: "GET",
            });

            setLogs(prev => [
                ...prev,
                `Call ${nextCall}: OK (status ${res.status})`,
            ]);
            setCallCount(nextCall);
        } catch (err: any) {
            if (err.guard402) {
                const reason =
                    err.guard402.reason ??
                    err.guard402.res?.reason ??
                    "policy limit exceeded";

                setLogs(prev => [
                    ...prev,
                    `Call ${nextCall}: BLOCKED - ${reason}`,
                ]);
                setBlocked(true);
            } else {
                setLogs(prev => [
                    ...prev,
                    `Call ${nextCall}: ERROR - ${String(err)}`,
                ]);
            }
        }

        // refresh subscription spend summary for *all* subscriptions in this store
        const store = client.guard.store as UsageStore;
        const summary = getSubscriptionSpendSummary(store);
        setSubSummary(summary);
    }

    function handleReset() {
        const store: any = client.guard.store;
        if (typeof store.reset === "function") {
            store.reset();
        }
        setLogs([]);
        setSubSummary([]);
        setBlocked(false);
        setCallCount(0);
        setLastInvoice(null);
    }

    function handleDownloadInvoice() {
        const cfg = PLANS[plan];
        const store = client.guard.store as UsageStore;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const invoice = generateInvoice({
            store,
            subscriptionId: cfg.subscriptionId,
            periodStart: todayStart,
            periodEnd: todayEnd,
        });

        setLastInvoice(invoice);

        const blob = new Blob(
            [JSON.stringify(invoice, null, 2)],
            { type: "application/json" },
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${cfg.subscriptionId}-${todayStart
            .toISOString()
            .slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }


    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center gap-6 p-8">
            <h1 className="text-3xl font-bold">402Guard subscriptions demo</h1>

            <p className="text-gray-300 text-center max-w-2xl">
                Pick a plan, make guarded API calls on that subscription, see daily caps
                enforced, and download a JSON invoice for today&apos;s usage.
            </p>

            {/* Plan picker */}
            <div className="flex gap-3">
                {Object.entries(PLANS).map(([id, cfg]) => (
                    <button
                        key={id}
                        onClick={() => {
                            setPlan(id as PlanId);
                            setBlocked(false);
                            setCallCount(0);
                            setLogs([]);
                            setLastInvoice(null);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-semibold border ${plan === id
                            ? "bg-emerald-500 text-black border-emerald-400"
                            : "bg-neutral-900 text-neutral-100 border-neutral-700"
                            }`}
                    >
                        {cfg.label}
                    </button>
                ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleCall}
                    disabled={blocked}
                    className={`px-4 py-2 rounded-md text-sm font-semibold ${blocked
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                        }`}
                >
                    {blocked
                        ? "Limit reached for this subscription"
                        : "Make guarded API call"}
                </button>

                <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
                >
                    Reset subscription analytics
                </button>

                <button
                    onClick={handleDownloadInvoice}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-sky-600 text-black hover:bg-sky-500"
                >
                    Download invoice (today)
                </button>
            </div>

            {/* Logs */}
            <div className="mt-4 w-full max-w-2xl bg-neutral-900 rounded p-4 text-sm font-mono text-neutral-100">
                {logs.length === 0 ? (
                    <div>No calls yet</div>
                ) : (
                    logs.map((l, i) => <div key={i}>{l}</div>)
                )}
            </div>

            {/* Subscription spend summary */}
            <div className="mt-6 w-full max-w-2xl bg-neutral-900 rounded p-4 text-sm text-neutral-100">
                <h2 className="font-semibold mb-2">Subscription spend summary</h2>
                {subSummary.length === 0 ? (
                    <div className="text-neutral-400 text-xs">
                        No data yet. Make a call to see stats.
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="text-neutral-400 text-[0.7rem] uppercase">
                            <tr>
                                <th className="text-left pb-1">Subscription</th>
                                <th className="text-right pb-1">Calls</th>
                                <th className="text-right pb-1">Total USD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subSummary.map(row => (
                                <tr key={row.subscriptionId}>
                                    <td className="py-0.5">{row.subscriptionId}</td>
                                    <td className="py-0.5 text-right">{row.count}</td>
                                    <td className="py-0.5 text-right">
                                        {row.totalUsd.toFixed(4)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Last invoice preview */}
            {lastInvoice && (
                <div className="mt-4 w-full max-w-2xl bg-neutral-900 rounded p-4 text-xs text-neutral-200 font-mono overflow-x-auto max-h-64">
                    <div className="font-semibold mb-2">
                        Last generated invoice (preview)
                    </div>
                    <pre>{JSON.stringify(lastInvoice, null, 2)}</pre>
                </div>
            )}
        </main>
    );
}
