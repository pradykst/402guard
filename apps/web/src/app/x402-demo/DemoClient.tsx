"use client";

import { useState, useMemo } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createBrowserThirdwebClient } from "@/lib/thirdwebClient";
import { createThirdwebPayWithX402 } from "@/lib/payWithX402Thirdweb";
import { createGuardedAxios } from "@402guard/client";
import { avalancheFuji } from "thirdweb/chains";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CodeBlock } from "@/components/CodeBlock";

export default function DemoClient({ clientId }: { clientId: string }) {
    const client = useMemo(() => createBrowserThirdwebClient(clientId), [clientId]);

    return (
        <ThirdwebProvider>
            <DemoContent client={client} clientId={clientId} />
        </ThirdwebProvider>
    );
}

function DemoContent({ client, clientId }: { client: any, clientId: string }) {
    const account = useActiveAccount();
    const [state, setState] = useState({
        loading: false,
        lastResult: null as any,
        lastError: null as any,
        lastGuardDecision: null as string | null,
    });

    const [spend, setSpend] = useState({
        session: 0,
        requests: 0
    });

    const [showCode, setShowCode] = useState(false);

    // Re-create guarded axios when account changes so it has access to the signer
    const guardedAxios = useMemo(() => {
        return createGuardedAxios({
            agentId: "demo-front-end",
            subscriptionId: "thirdweb-x402-demo",
            facilitatorId: "thirdweb",
            payWithX402: createThirdwebPayWithX402({ clientId, account }),
            selectPaymentOption: (quote: any) => {
                return quote.options ? quote.options[0] : quote;
            },
            estimateUsdFromQuote: () => 0.01,
            policies: {
                // Relaxed policy for demo flexibility
                global: { dailyUsdCap: 50, monthlyUsdCap: 200 },
                services: { "x402-thirdweb-demo": { dailyUsdCap: 20, perRequestMaxUsd: 5 } },
            },
        });
    }, [clientId, account]);

    async function handlePaidCall() {
        setState(prev => ({ ...prev, loading: true, lastResult: null, lastError: null, lastGuardDecision: null }));

        try {
            const response = await guardedAxios.guardedRequest({
                url: "/api/x402-thirdweb-demo",
                method: "GET",
            });

            setState({
                loading: false,
                lastResult: response.data,
                lastError: null,
                lastGuardDecision: "allowed",
            });
            setSpend(prev => ({ session: prev.session + 0.01, requests: prev.requests + 1 }));

        } catch (err: any) {
            console.error(err);
            const guardInfo = err.guard402 || null;
            setState({
                loading: false,
                lastResult: null,
                lastError: err.message || "Unknown error",
                lastGuardDecision: guardInfo?.reason || "blocked/error",
            });
        }
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-2 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">x402 Guarded Payment Demo</h1>
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                        Live Payment
                    </span>
                </div>
                <p className="text-zinc-400 max-w-2xl text-lg">
                    Intercepts API calls, handles 402 responses, and settles payments on-chain via Thirdweb.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Configuration</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-white font-mono">thirdweb</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Facilitator</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-white">USDC</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Token (Fuji)</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-white font-mono">$0.01</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Cost</div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Actions</h2>
                        <Card title="Traffic Control">
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
                                    {state.loading ? "Processing On-Chain Payment..." : "Access Premium Content ($0.01)"}
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
                                <div className="text-2xl font-mono text-white">${spend.session.toFixed(2)}</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Session Spent</div>
                            </div>
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="text-2xl font-mono text-white">{spend.requests}</div>
                                <div className="text-xs text-zinc-400 uppercase mt-1">Requests</div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className={`
                            p-4 rounded-lg border-2 transition-all
                            ${state.lastGuardDecision === 'allowed' ? 'bg-blue-600/10 border-blue-600' :
                                state.lastGuardDecision ? 'bg-red-900/10 border-red-500' :
                                    'bg-zinc-900 border-zinc-800'}
                        `}>
                            <h3 className={`text-xs uppercase tracking-wider font-bold mb-1 ${state.lastGuardDecision === 'allowed' ? 'text-blue-400' :
                                    state.lastGuardDecision ? 'text-red-400' : 'text-zinc-500'
                                }`}>
                                Guardrails Decision
                            </h3>
                            <p className={`text-2xl font-medium ${state.lastGuardDecision === 'allowed' ? 'text-blue-400' :
                                    state.lastGuardDecision ? 'text-red-400' : 'text-zinc-500'
                                }`}>
                                {state.lastGuardDecision ? state.lastGuardDecision.toUpperCase() : "WAITING..."}
                            </p>
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
                        code={`const guardedAxios = useMemo(() => {
    return createGuardedAxios({
        agentId: "demo-front-end",
        subscriptionId: "thirdweb-x402-demo",
        facilitatorId: "thirdweb",
        payWithX402: createThirdwebPayWithX402({ clientId, account }),
        selectPaymentOption: (quote) => {
            return quote.options ? quote.options[0] : quote;
        },
        estimateUsdFromQuote: () => 0.01,
        policies: {
            global: { dailyUsdCap: 50, monthlyUsdCap: 200 },
            services: { "x402-thirdweb-demo": { dailyUsdCap: 20, perRequestMaxUsd: 5 } },
        },
    });
}, [clientId, account]);

await guardedAxios.guardedRequest({
    url: "/api/x402-thirdweb-demo",
    method: "GET",
});`}
                    />
                )}
            </div>
        </div>
    );
}
