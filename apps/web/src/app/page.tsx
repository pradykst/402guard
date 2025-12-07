"use client";

import { useState } from "react";
import {
  createGuardedAxios, PolicyConfig,
  getServiceSpendSummary,
  getAgentSpendSummary
} from "@402guard/client";

const policies: PolicyConfig = {
  services: {
    "jsonplaceholder.typicode.com": {
      dailyUsdCap: 0.03 // pretend each call costs $0.01
    }
  }
};

// x402 stub helpers for the demo.
// We type them as `any` here to avoid cross-package type wiring noise.

// function selectPaymentOptionStub(quote: any) {
//   // In a real flow you might inspect `quote.accepts` and pick based on network/asset.
//   return quote.accepts[0];
// }

// function estimateUsdFromQuoteStub(quote: any, option: any): number {
//   // For Avalanche USDC later:
//   // return parseInt(option.maxAmountRequired, 10) / 1_000_000;
//   // For now, just treat every x402 quote as $0.01.
//   return 0.01;
// }

// async function payWithX402Stub(args: {
//   quote: any;
//   option: any;
//   originalConfig: any;
//   axiosInstance: any;
// }) {
//   console.log("Simulating x402 payment with facilitator stub", {
//     network: args.option.network,
//     asset: args.option.asset,
//   });

//   // In real life:
//   // 1) Build X-PAYMENT header/body
//   // 2) Send axiosInstance.request with those headers
//   // 3) Parse X-PAYMENT-RESPONSE header
//   const response = await args.axiosInstance.request(args.originalConfig);

//   const settlement = {
//     success: true,
//     transaction: "0x-simulated",
//     network: "avalanche-fuji",
//     payer: "0x-simulated-payer",
//     errorReason: null,
//   };

//   return { response, settlement };
// }


const http = createGuardedAxios({
  policies,
  agentId: "demo-agent",
  estimateUsdForRequest: () => 0.01,
  // facilitatorId: "stub-facilitator",
  // selectPaymentOption: selectPaymentOptionStub,
  // estimateUsdFromQuote: estimateUsdFromQuoteStub,
  // payWithX402: payWithX402Stub,
});

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [callCount, setCallCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [serviceSummary, setServiceSummary] = useState<
    ReturnType<typeof getServiceSpendSummary>
  >([]);
  const [agentSummary, setAgentSummary] = useState<
    ReturnType<typeof getAgentSpendSummary>
  >([]);

  async function handleCall() {
    if (blocked) return;

    const nextCall = callCount + 1;

    try {
      const res = await http.guardedRequest({
        url: "https://jsonplaceholder.typicode.com/todos/1",
        method: "GET"
      });

      setLogs(prev => [
        ...prev,
        `Call ${nextCall}: OK (status ${res.status})`
      ]);
      setCallCount(nextCall);
    } catch (err: any) {
      if (err.guard402) {
        const reason =
          err.guard402.reason ??
          err.guard402.res?.reason ?? // backwards-compat if we ever change again
          "policy limit exceeded";

        setLogs(prev => [
          ...prev,
          `Call ${nextCall}: BLOCKED - ${reason}`
        ]);
        setBlocked(true);
      } else {
        setLogs(prev => [
          ...prev,
          `Call ${nextCall}: ERROR - ${String(err)}`
        ]);
      }
    }
    const services = getServiceSpendSummary(http.guard.store);
    const agents = getAgentSpendSummary(http.guard.store);
    setServiceSummary(services);
    setAgentSummary(agents);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-black">
      <h1 className="text-3xl font-bold text-white">402Guard Axios demo</h1>

      <p className="text-gray-300 text-center max-w-xl">
        Click the button to make a guarded HTTP call to jsonplaceholder.
        Each call is treated as costing $0.01. The daily cap for that
        service is $0.03, so the fourth call should be blocked.
      </p>

      <button
        onClick={handleCall}
        disabled={blocked}
        className={`px-4 py-2 rounded-md text-sm font-semibold ${blocked
          ? "bg-gray-600 text-gray-300 cursor-not-allowed"
          : "bg-emerald-500 text-black hover:bg-emerald-400"
          }`}
      >
        {blocked ? "Limit reached" : "Make guarded API call"}
      </button>
      <button
        onClick={() => {
          const store: any = http.guard.store;
          if (typeof store.reset === "function") {
            store.reset();
          }
          setLogs([]);
          setServiceSummary([]);
          setAgentSummary([]);
          setBlocked(false);
          setCallCount(0);
        }}
        className="px-4 py-2 rounded-md text-sm font-semibold bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
      >
        Reset analytics
      </button>

      <div className="mt-4 w-full max-w-xl bg-neutral-900 rounded p-4 text-sm font-mono text-neutral-100">
        {logs.length === 0 ? (
          <div>No calls made yet</div>
        ) : (
          logs.map((l, idx) => <div key={idx}>{l}</div>)
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
