"use client";

import { useState, useMemo } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createBrowserThirdwebClient } from "@/lib/thirdwebClient";
import { createThirdwebPayWithX402 } from "@/lib/payWithX402Thirdweb";
import { createGuardedAxios } from "@402guard/client";
import { avalancheFuji } from "thirdweb/chains";
import Link from 'next/link';

export default function DemoClient({ clientId }: { clientId: string }) {
    // Create client using passed ID
    const client = useMemo(() => createBrowserThirdwebClient(clientId), [clientId]);

    return (
        <ThirdwebProvider>
            <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-teal-500/30">
                <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-10">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link href="/" className="font-bold text-xl tracking-tight text-white hover:text-teal-400 transition-colors">
                                402Guard
                            </Link>
                            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-neutral-400">
                                <Link href="/x402-demo" className="text-white">x402 Demo</Link>
                                <Link href="/subscriptions-demo" className="hover:text-white transition-colors">Subscriptions Demo</Link>
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <ConnectButton client={client} chain={avalancheFuji} theme="dark" />
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8 md:py-12">
                    <DemoContent client={client} clientId={clientId} />
                </main>
            </div>
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

    // Re-create guarded axios when account changes so it has access to the signer
    const guardedAxios = useMemo(() => {
        return createGuardedAxios({
            agentId: "demo-front-end",
            subscriptionId: "thirdweb-x402-demo",
            facilitatorId: "thirdweb",
            payWithX402: createThirdwebPayWithX402({ clientId, account }), // Pass account here
            selectPaymentOption: (quote) => {
                return quote.options ? quote.options[0] : quote;
            },
            estimateUsdFromQuote: () => 0.01,
            policies: {
                global: { dailyUsdCap: 5, monthlyUsdCap: 20 },
                services: { "x402-thirdweb-demo": { dailyUsdCap: 2, perRequestMaxUsd: 0.5 } },
            },
        });
    }, [clientId, account]);

    async function handlePaidCall() {
        setState({ loading: true, lastResult: null, lastError: null, lastGuardDecision: null });

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 md:p-8">
                    <h1 className="text-3xl font-bold mb-2">Paid API Access</h1>
                    <p className="text-neutral-400 mb-8">
                        This demo shows how 402Guard intercepts API calls, handles 402 Payment Required responses,
                        and settles payments on-chain via Thirdweb, all while enforcing budget policies.
                    </p>

                    <div className="flex flex-col gap-4">
                        {!account ? (
                            <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-200 rounded-lg text-sm">
                                Please connect your wallet to continue.
                            </div>
                        ) : (
                            <div className="p-4 bg-teal-500/10 border border-teal-500/20 text-teal-200 rounded-lg text-sm flex items-center justify-between">
                                <span>Wallet Connected</span>
                                <span className="font-mono text-xs opacity-70">{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
                            </div>
                        )}

                        <button
                            onClick={handlePaidCall}
                            disabled={!account || state.loading}
                            className={`
                                w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all
                                ${!account ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' :
                                    state.loading ? 'bg-teal-600/50 cursor-wait' :
                                        'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/20'}
                            `}
                        >
                            {state.loading ? "Processing Payment..." : "Access Premium Content ($0.01)"}
                        </button>
                    </div>
                </div>
                {/* Analytics UI same as before... */}
                <div className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">Session Analytics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                            <div className="text-2xl font-mono text-white">${spend.session.toFixed(2)}</div>
                            <div className="text-xs text-neutral-400 mt-1">Total Spent</div>
                        </div>
                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                            <div className="text-2xl font-mono text-white">{spend.requests}</div>
                            <div className="text-xs text-neutral-400 mt-1">requests</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className={`
                    rounded-xl p-6 border transition-colors
                    ${state.lastGuardDecision === 'allowed' ? 'bg-green-900/10 border-green-500/20' :
                        state.lastGuardDecision ? 'bg-red-900/10 border-red-500/20' :
                            'bg-neutral-800/30 border-neutral-800'}
                 `}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                        Guardrails Decision
                    </h3>
                    <p className={`text-lg font-medium ${state.lastGuardDecision === 'allowed' ? 'text-green-400' :
                            state.lastGuardDecision ? 'text-red-400' : 'text-neutral-500'
                        }`}>
                        {state.lastGuardDecision ? state.lastGuardDecision.toUpperCase() : "Waiting for request..."}
                    </p>
                </div>

                <div className="flex-1 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-4 overflow-auto font-mono text-sm">
                        {state.lastResult ? (
                            <pre className="text-green-400">{JSON.stringify(state.lastResult, null, 2)}</pre>
                        ) : state.lastError ? (
                            <pre className="text-red-400">{JSON.stringify({ error: state.lastError }, null, 2)}</pre>
                        ) : (
                            <span className="text-neutral-600">// Output</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
