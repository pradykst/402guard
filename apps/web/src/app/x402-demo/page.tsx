"use client";

import { useState } from "react";
import { createGuardedAxios } from "@402guard/client";

type LogEntry = string;

export default function X402DemoPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [blocked, setBlocked] = useState(false);
    const [callCount, setCallCount] = useState(0);

    // Very simple x402 helpers just for the demo.
    // We keep them untyped here to avoid pulling more types into the app bundle.

    function selectPaymentOptionStub(quote: any) {
        // Our fake API only returns a single option.
        return quote.accepts[0];
    }

    function estimateUsdFromQuoteStub(quote: any, option: any): number {
        // In real life: convert maxAmountRequired from smallest units to USD.
        // For the demo, treat every quote as $0.01 to reuse our mental model.
        return 0.01;
    }

    async function payWithX402Stub(args: {
        quote: any;
        option: any;
        originalConfig: any;
        axiosInstance: any;
    }) {
        // Simulate "pay then retry" by calling the same endpoint
        // with an extra header the API route is looking for.
        const paidConfig = {
            ...args.originalConfig,
            headers: {
                ...(args.originalConfig.headers || {}),
                "x-test-payment": "paid",
            },
        };

        const response = await args.axiosInstance.request(paidConfig);

        const settlement = {
            success: true,
            transaction: "0x-demo-tx",
            network: args.option.network,
            payer: "0x-demo-payer",
            errorReason: null,
        };

        return { response, settlement };
    }

    // We don't care about caps here; we just want to exercise the x402 path.
    // So policies can be empty, meaning "always allowed".
    const x402Http = createGuardedAxios({
        policies: {},
        agentId: "x402-demo-agent",

        // We won't use estimateUsdForRequest in this flow;
        // x402 price is taken from the quote instead.
        estimateUsdForRequest: undefined,

        facilitatorId: "local-fake-facilitator",
        selectPaymentOption: selectPaymentOptionStub,
        estimateUsdFromQuote: estimateUsdFromQuoteStub,
        payWithX402: payWithX402Stub,
    });

    async function handleX402Call() {
        if (blocked) return;

        const nextCall = callCount + 1;
        setLogs(prev => [...prev, `Call ${nextCall}: starting...`]);

        try {
            const res = await x402Http.guardedRequest({
                baseURL: "http://localhost:3000",
                url: "/api/fake402",
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
    }


    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center gap-6 p-8">
            <h1 className="text-3xl font-bold">402Guard x402 demo</h1>

            <p className="text-gray-300 text-center max-w-xl">
                This demo hits a local <code>/api/fake402</code> endpoint that first
                responds with HTTP 402 and an x402 quote, then simulates payment and
                retries using 402Guard.
            </p>

            <button
                onClick={handleX402Call}
                disabled={blocked}
                className={`px-4 py-2 rounded-md text-sm font-semibold ${blocked
                    ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                    }`}
            >
                {blocked ? "Blocked by policy" : "Call fake402 with 402Guard"}
            </button>

            <div className="mt-4 w-full max-w-xl bg-neutral-900 rounded p-4 text-sm font-mono text-neutral-100">
                {logs.length === 0 ? (
                    <div>No calls yet</div>
                ) : (
                    logs.map((l, i) => <div key={i}>{l}</div>)
                )}
            </div>
        </main>
    );
}
