"use client";

import { useState } from "react";
import { createGuardedAxios } from "@402guard/client";
import {
    getServiceSpendSummary,
    getAgentSpendSummary,
    generateInvoiceCsv,
} from "@402guard/client";



type LogEntry = string;

// --- x402 helpers at module scope ---

function selectPaymentOptionStub(quote: any) {
    // Our fake API only returns a single option.
    return quote.accepts[0];
}

function estimateUsdFromQuoteStub(quote: any, option: any): number {
    // In real life: convert maxAmountRequired from smallest units to USD.
    // For the demo, treat every quote as $0.01 so our budgets stay simple.
    return 0.01;
}

async function payWithX402Stub(args: {
    quote: any;
    option: any;
    originalConfig: any;
    axiosInstance: any;
}) {
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
function handleDownloadInvoice() {
    const csv = generateInvoiceCsv({
        store: x402Http.guard.store,
        agentId: "x402-demo-agent",
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "402guard-x402-invoice.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


// --- guarded client at module scope (store persists across renders) ---

const x402Http = createGuardedAxios({
    policies: {
        services: {
            // extractServiceIdFromUrl("http://localhost:3000/...") => "localhost"
            "localhost:3000": {
                dailyUsdCap: 0.03, // three calls at $0.01, then blocked
            },
        },
    },
    agentId: "x402-demo-agent",

    // Not used in this flow; price comes from the quote
    estimateUsdForRequest: undefined,

    facilitatorId: "local-fake-facilitator",
    selectPaymentOption: selectPaymentOptionStub,
    estimateUsdFromQuote: estimateUsdFromQuoteStub,
    payWithX402: payWithX402Stub,
});

// --- React component uses the shared client ---

export default function X402DemoPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [blocked, setBlocked] = useState(false);
    const [callCount, setCallCount] = useState(0);
    const [serviceSummary, setServiceSummary] = useState<
        ReturnType<typeof getServiceSpendSummary>
    >([]);
    const [agentSummary, setAgentSummary] = useState<
        ReturnType<typeof getAgentSpendSummary>
    >([]);


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
        const services = getServiceSpendSummary(x402Http.guard.store);
        const agents = getAgentSpendSummary(x402Http.guard.store);
        setServiceSummary(services);
        setAgentSummary(agents);

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
            <button
                onClick={handleDownloadInvoice}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
            >
                Download CSV invoice
            </button>

            <div className="mt-4 w-full max-w-xl bg-neutral-900 rounded p-4 text-sm font-mono text-neutral-100">
                {logs.length === 0 ? (
                    <div>No calls yet</div>
                ) : (
                    logs.map((l, i) => <div key={i}>{l}</div>)
                )}
            </div>
            <div className="mt-6 w-full max-w-xl grid gap-4">
                <div className="bg-neutral-900 rounded p-4 text-sm text-neutral-100">
                    <h2 className="font-semibold mb-2">Service spend summary</h2>
                    {serviceSummary.length === 0 ? (
                        <div className="text-neutral-400 text-xs">
                            No data yet. Make a call to see stats.
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="text-neutral-400 text-[0.7rem] uppercase">
                                <tr>
                                    <th className="text-left pb-1">Service</th>
                                    <th className="text-right pb-1">Calls</th>
                                    <th className="text-right pb-1">Total USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceSummary.map(row => (
                                    <tr key={row.serviceId}>
                                        <td className="py-0.5">{row.serviceId}</td>
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

                <div className="bg-neutral-900 rounded p-4 text-sm text-neutral-100">
                    <h2 className="font-semibold mb-2">Agent spend summary</h2>
                    {agentSummary.length === 0 ? (
                        <div className="text-neutral-400 text-xs">
                            No data yet. Make a call to see stats.
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="text-neutral-400 text-[0.7rem] uppercase">
                                <tr>
                                    <th className="text-left pb-1">Agent</th>
                                    <th className="text-right pb-1">Calls</th>
                                    <th className="text-right pb-1">Total USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agentSummary.map(row => (
                                    <tr key={row.agentId}>
                                        <td className="py-0.5">{row.agentId}</td>
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
            </div>
        </main>
    );
}
