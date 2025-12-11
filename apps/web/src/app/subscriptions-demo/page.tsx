"use client";

import { useMemo, useState } from "react";
import { ThirdwebProvider, useActiveAccount } from "thirdweb/react";
import {
    getSubscriptionSpendSummary,
    type UsageStore,
} from "@402guard/client";
import {
    createSubscriptionAxios,
    generateInvoice,
    type Invoice,
    getSubscriptionStatus,
} from "@402guard/subscriptions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { OnchainSubscriptionCard } from "@/components/OnchainSubscriptionCard";


type PlanId = "starter" | "pro";

const PLANS: Record<
    PlanId,
    { label: string; dailyCap: number; subscriptionId: string; description: string }
> = {
    starter: {
        label: "Starter",
        description: "$0.03/day cap",
        dailyCap: 0.03,
        subscriptionId: "sub-starter",
    },
    pro: {
        label: "Pro",
        description: "$0.10/day cap",
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
    return <SubscriptionsDemoContent />;
}

function SubscriptionsDemoContent() {
    const [plan, setPlan] = useState<PlanId>("starter");
    const [logs, setLogs] = useState<string[]>([]);
    const [blocked, setBlocked] = useState(false);
    const [callCount, setCallCount] = useState(0);
    const [subSummary, setSubSummary] = useState<
        ReturnType<typeof getSubscriptionSpendSummary>
    >([]);
    const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

    const account = useActiveAccount();
    const connectedWallet = account?.address as `0x${string}` | undefined;
    const fallbackWallet = process.env.NEXT_PUBLIC_SUBSCRIPTION_DEMO_WALLET as `0x${string}` ?? "0x0000000000000000000000000000000000000000";
    const displayWallet = connectedWallet ?? fallbackWallet;

    // this must match whatever you used in createPlan / Foundry script
    const PLAN_ID = "demo-plan";


    // whenever plan changes, we use the corresponding guarded client
    const client = useMemo(() => getClientForPlan(plan), [plan]);

    // Get current plan stats
    const currentPlanConfig = PLANS[plan];
    const currentStats = subSummary.find(s => s.subscriptionId === currentPlanConfig.subscriptionId) || { count: 0, totalUsd: 0 };
    const remainingBudget = Math.max(0, currentPlanConfig.dailyCap - currentStats.totalUsd);

    async function handleCall() {
        if (blocked) return;

        const nextCall = callCount + 1;
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Call ${nextCall}: starting...`]);

        try {
            const res = await client.guardedRequest({
                url: "https://jsonplaceholder.typicode.com/todos/1",
                method: "GET",
            });

            setLogs(prev => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Call ${nextCall}: OK (status ${res.status})`,
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
                    `[${new Date().toLocaleTimeString()}] Call ${nextCall}: BLOCKED - ${reason}`,
                ]);
                setBlocked(true);
            } else {
                setLogs(prev => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] Call ${nextCall}: ERROR - ${String(err)}`,
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

    async function handleDownloadInvoice() {
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

        // Dynamically import jspdf to avoid SSR issues
        const jsPDF = (await import("jspdf")).default;
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF();

        // -- Header --
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("INVOICE", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("402Guard Demo", 14, 30);
        doc.text("Avalanche Fuji", 14, 35);

        // -- Invoice Details --
        const rightX = 140;
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, rightX, 30);
        doc.text(`Invoice #: ${Math.floor(Math.random() * 10000)}`, rightX, 35);
        doc.text(`Subscription: ${cfg.label} Plan`, rightX, 40);
        doc.text(`Wallet: ${displayWallet.slice(0, 6)}...${displayWallet.slice(-4)}`, rightX, 45);

        // -- Bill To (Abstract) --
        doc.text("Bill To:", 14, 55);
        doc.setFont("helvetica", "bold");
        doc.text("Demo User", 14, 60);
        doc.setFont("helvetica", "normal");
        doc.text(displayWallet, 14, 65);

        // -- Line Items --
        const tableData = invoice.lines.map(line => [
            line.serviceId,
            line.count.toString(),
            `$${line.totalUsd.toFixed(4)}`
        ]);

        autoTable(doc, {
            head: [["Service", "Requests", "Amount (USD)"]],
            body: tableData,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 10, cellPadding: 3 },
        });

        // -- Total --
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Total: $${invoice.totalUsd.toFixed(4)}`, 140, finalY);

        // -- Footer --
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text("Thank you for using 402Guard on Avalanche Fuji.", 14, 280);

        // Save
        doc.save(`invoice-${cfg.subscriptionId}.pdf`);
    }


    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-2 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">402Guard Subscriptions Demo</h1>
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                        {PLANS[plan].label} Plan Selected
                    </span>
                </div>
                <p className="text-zinc-400 max-w-2xl text-lg">
                    Pick a plan, make guarded API calls on that subscription, see daily caps
                    enforced, and download a JSON invoice for today&apos;s usage.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Plan Selector */}
                    <section>
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Select Plan</h2>
                        <div className="grid grid-cols-2 gap-4">
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
                                    className={`
                                        text-left p-4 rounded-lg border-2 transition-all
                                        ${plan === id
                                            ? "bg-blue-600/10 border-blue-600"
                                            : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}
                                    `}
                                >
                                    <div className={`font-bold ${plan === id ? "text-blue-400" : "text-white"}`}>{cfg.label}</div>
                                    <div className="text-zinc-400 text-sm">{cfg.description}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Actions */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Actions</h2>

                        <Card title="Simulate Traffic">
                            <div className="flex flex-col gap-4">
                                <Button
                                    onClick={handleCall}
                                    disabled={blocked}
                                    variant={blocked ? "secondary" : "primary"}
                                    className="w-full text-lg h-12"
                                >
                                    {blocked ? "Limit Reached (Blocked)" : "Make Guarded API Call ($0.01)"}
                                </Button>
                                <Button onClick={handleReset} variant="outline" size="sm" className="w-full">
                                    Reset Local Analytics
                                </Button>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                onClick={handleDownloadInvoice}
                                variant="secondary"
                                className="w-full col-span-2"
                            >
                                Download PDF Invoice
                            </Button>
                        </div>
                        <div className="mt-8">
                            <OnchainSubscriptionCard defaultPlanId={PLAN_ID} />
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    {/* Spend Summary */}
                    <Card title="Live Spend Summary">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-2xl font-mono text-white">{currentStats.count}</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Total Requests</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-2xl font-mono text-white">${currentStats.totalUsd.toFixed(2)}</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Total Spent</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-2xl font-mono text-zinc-400">${currentPlanConfig.dailyCap.toFixed(2)}</div>
                                <div className="text-xs text-zinc-500 uppercase mt-1">Daily Cap</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className={`text-2xl font-mono ${remainingBudget < 0.01 ? "text-red-400" : "text-green-400"}`}>
                                    ${remainingBudget.toFixed(2)}
                                </div>
                                <div className="text-xs text-zinc-500 uppercase mt-1">Remaining Budget</div>
                            </div>
                        </div>
                    </Card>

                    {/* Console Output */}
                    <div className="rounded-xl border border-zinc-800 bg-[#0c0c0c] overflow-hidden flex flex-col min-h-[300px]">
                        <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                            System Events
                        </div>
                        <div className="p-4 overflow-auto font-mono text-xs flex-1 space-y-2">
                            {logs.length === 0 ? (
                                <div className="text-zinc-600">// Ready...</div>
                            ) : (
                                logs.map((l, i) => (
                                    <div key={i} className={l.includes("BLOCKED") ? "text-red-400" : l.includes("ERROR") ? "text-red-400" : "text-green-400"}>
                                        {l}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Extra Output */}
            <div className="grid md:grid-cols-2 gap-8">

                {lastInvoice && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-hidden">
                        <h3 className="text-sm font-semibold text-zinc-400 mb-2">Invoice Preview</h3>
                        <pre className="text-xs text-zinc-300 font-mono overflow-auto max-h-40">
                            {JSON.stringify(lastInvoice, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
