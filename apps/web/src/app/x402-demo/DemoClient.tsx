"use client";

import { useState, useMemo } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createBrowserThirdwebClient } from "@/lib/thirdwebClient";
import { createThirdwebPayWithX402 } from "@/lib/payWithX402Thirdweb";
import { createGuardedAxios, getAgentSpendSummary, type UsageStore, type PolicyConfig } from "@402guard/client";
import { avalancheFuji } from "thirdweb/chains";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CodeBlock } from "@/components/CodeBlock";
import { OnchainSubscriptionCard } from "@/components/OnchainSubscriptionCard";

export default function DemoClient({ clientId }: { clientId: string }) {
    const client = useMemo(() => createBrowserThirdwebClient(clientId), [clientId]);

    return <DemoContent client={client} clientId={clientId} />;
}

type GuardDecision =
    | { status: "idle" }
    | { status: "allowed"; usdAmount: number }
    | { status: "blocked"; reason: string; usdAmount?: number };

function DemoContent({ client, clientId }: { client: any, clientId: string }) {
    const account = useActiveAccount();

    // --- Session Cap State ---
    const [sessionCapUsd, setSessionCapUsd] = useState(0.05);
    const agentId = "x402-demo";

    // --- Demo Operation State ---
    const [state, setState] = useState({
        loading: false,
        lastResult: null as any,
        lastError: null as any,
    });
    const [decision, setDecision] = useState<GuardDecision>({ status: "idle" });
    const [spendSummary, setSpendSummary] = useState({ totalUsd: 0, count: 0 });

    const [showCode, setShowCode] = useState(false);

    // 1. Build PolicyConfig based on sessionCapUsd
    const policies: PolicyConfig = useMemo(
        () => ({
            budgets: [
                {
                    id: "x402-session-cap",
                    scope: { agentId },
                    windowMs: 24 * 60 * 60 * 1000, // 24h rolling
                    maxUsdCents: Math.round(sessionCapUsd * 100),
                },
            ],
        }),
        [sessionCapUsd, agentId],
    );

    // 2. Create Guarded Axios
    const guardedAxios = useMemo(() => {
        return createGuardedAxios({
            policies,
            agentId,
            subscriptionId: "thirdweb-x402-demo",
            facilitatorId: "thirdweb",
            payWithX402: createThirdwebPayWithX402({
                client, // Use the client object passed as prop
                account,
                // HARDCODING SERVER WALLET FOR DEMO STABILITY - Replace with env var in prod
                recipientAddress: "0x420aC537F1a45bb02Ad620D2dd6d63C15aaBbe62"
            }),
            selectPaymentOption: (quote: any) => {
                return quote.options ? quote.options[0] : quote;
            },
            estimateUsdFromQuote: () => 0.01,
        });
    }, [policies, client, account]);

    // Helper to refresh analytics
    function refreshAnalytics() {
        if (!guardedAxios.guard) return;
        const store = guardedAxios.guard.store as UsageStore;
        // The store is synchronous in memory
        const summary = getAgentSpendSummary(store, { agentId });
        // summary is an array, we take the first or default
        const s = summary[0] ?? { totalUsd: 0, count: 0 };
        setSpendSummary(s);
    }

    // 3. Handle calls
    async function handlePaidCall() {
        setState(prev => ({ ...prev, loading: true, lastResult: null, lastError: null }));
        setDecision({ status: "idle" });

        try {
            const response = await guardedAxios.guardedRequest({
                url: "/api/x402-thirdweb-demo",
                method: "GET",
            });

            setState({
                loading: false,
                lastResult: response.data,
                lastError: null,
            });
            // We assume cost is 0.01 for this demo, or we could extract from the quote/response meta if available
            setDecision({ status: "allowed", usdAmount: 0.01 });

        } catch (err: any) {
            console.error(err);
            if (err.guard402) {
                setDecision({
                    status: "blocked",
                    reason: err.guard402.reason ?? "Budget cap exceeded",
                    usdAmount: err.guard402.usdAmount,
                });
                setState(prev => ({ ...prev, loading: false }));
            } else {
                setDecision({
                    status: "blocked",
                    reason: "Network or facilitator error",
                });
                setState({
                    loading: false,
                    lastResult: null,
                    lastError: err.message || "Unknown error",
                });
            }
        } finally {
            refreshAnalytics();
        }
    }

    const remaining = Math.max(0, sessionCapUsd - spendSummary.totalUsd);

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-2 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">x402 Guarded Payment Demo</h1>
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                        Live Payment
                    </span>
                </div>
                {state.lastError && typeof state.lastError === 'string' && state.lastError.includes("402") && (
                    <div className="p-3 bg-red-900/40 border border-red-500 rounded text-red-200 text-sm mt-4">
                        <strong>Payment Error:</strong> The server rejected the payment proof.
                    </div>
                )}
                <p className="text-zinc-400 max-w-2xl text-lg">
                    Intercepts API calls, handles 402 responses, and settles payments on-chain via Thirdweb.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Configuration</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Existing Cards combined or simplified */}
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 space-y-4">
                                <div>
                                    <div className="text-white font-mono">thirdweb</div>
                                    <div className="text-xs text-zinc-400 uppercase mt-1">Facilitator</div>
                                </div>
                                <div className="border-t border-zinc-800 pt-4">
                                    <div className="text-white font-mono">$0.01</div>
                                    <div className="text-xs text-zinc-400 uppercase mt-1">Cost / Request</div>
                                </div>
                            </div>

                            {/* Session Cap Card */}
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-zinc-400 text-xs uppercase mb-2">Session Cap</h3>
                                    <div className="flex gap-2">
                                        {[0.03, 0.05, 0.10].map(cap => (
                                            <button
                                                key={cap}
                                                onClick={() => {
                                                    setSessionCapUsd(cap);
                                                    // optionally reset usage? No, usage is persisted in memory store unless reset explicitly
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-bold font-mono transition-colors ${sessionCapUsd === cap
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                    }`}
                                            >
                                                ${cap.toFixed(2)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 text-xs font-mono">
                                    <span className={remaining < 0.01 ? "text-red-400" : "text-green-400"}>
                                        ${remaining.toFixed(2)}
                                    </span>
                                    <span className="text-zinc-500"> remaining of ${sessionCapUsd.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Actions</h2>
                        <Card title="Paid API Access">
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                                    <span className="text-sm text-zinc-400">Wallet Status</span>
                                    <div>
                                        <ConnectButton client={client} chain={avalancheFuji} theme="dark" />
                                    </div>
                                </div>

                                <Button
                                    onClick={handlePaidCall}
                                    disabled={!account || state.loading}
                                    className="w-full text-lg h-12"
                                    variant={!account ? "secondary" : "primary"}
                                >
                                    {state.loading ? "Processing..." : "Access Premium Content ($0.01)"}
                                </Button>
                            </div>
                        </Card>

                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Live Analytics</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-2xl font-mono text-white">${spendSummary.totalUsd.toFixed(2)}</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Session Spent</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-2xl font-mono text-white">{spendSummary.count}</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Requests</div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className={`
                            p-4 rounded-lg border-2 transition-all
                            ${decision.status === 'allowed' ? 'bg-blue-600/10 border-blue-600' :
                                decision.status === 'blocked' ? 'bg-red-900/10 border-red-500' :
                                    'bg-zinc-900 border-zinc-800'}
                        `}>
                            <h3 className={`text-xs uppercase tracking-wider font-bold mb-1 ${decision.status === 'allowed' ? 'text-blue-400' :
                                decision.status === 'blocked' ? 'text-red-400' : 'text-zinc-500'
                                }`}>
                                Guardrails Decision
                            </h3>
                            <div className="flex justify-between items-baseline">
                                <p className={`text-2xl font-medium ${decision.status === 'allowed' ? 'text-blue-400' :
                                    decision.status === 'blocked' ? 'text-red-400' : 'text-zinc-500'
                                    }`}>
                                    {decision.status === 'idle' ? "WAITING..." : decision.status.toUpperCase()}
                                </p>
                                {decision.status === 'allowed' && (
                                    <span className="text-xs text-blue-300">Within session cap</span>
                                )}
                            </div>
                            {decision.status === 'blocked' && (
                                <p className="text-xs text-red-300 mt-2">
                                    {decision.reason}
                                </p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-[#0c0c0c] overflow-hidden flex flex-col min-h-[300px]">
                            <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-widest font-semibold flex justify-between">
                                <span>Response Log</span>
                                <span>JSON</span>
                            </div>
                            <div className="p-4 overflow-auto font-mono text-sm flex-1">
                                {state.lastResult ? (
                                    <pre className="text-blue-400">{JSON.stringify(state.lastResult, null, 2)}</pre>
                                ) : state.lastError ? (
                                    <pre className="text-red-400">{JSON.stringify({ error: state.lastError }, null, 2)}</pre>
                                ) : (
                                    <span className="text-zinc-600">// Waiting for response...</span>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Collapsible Source Code */}
            <div className="border-t border-zinc-800 pt-8 mt-12">
                <button
                    onClick={() => setShowCode(!showCode)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mb-4"
                >
                    {showCode ? "Hide Client Code" : "Show Client Code"}
                    <svg className={`w-4 h-4 transition-transform ${showCode ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showCode && (
                    <CodeBlock
                        title="DemoClient.tsx (Snippet)"
                        code={`// Policy with session cap
const policies: PolicyConfig = useMemo(
    () => ({
        budgets: [
            // ...
        ],
    }),
    [sessionCapUsd, agentId],
);

const guardedAxios = useMemo(() => {
    return createGuardedAxios({
        policies,
        // ... x402 config
    });
}, [policies, account]);`}
                    />
                )}
            </div>
        </div>
    );
}
