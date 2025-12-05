"use client";

import { useState } from "react";
import { createGuardedAxios, PolicyConfig } from "@402guard/client";

const policies: PolicyConfig = {
  services: {
    "jsonplaceholder.typicode.com": {
      dailyUsdCap: 0.03 // pretend each call costs $0.01
    }
  }
};

const http = createGuardedAxios({
  policies,
  agentId: "demo-agent",
  estimateUsdForRequest: () => 0.01
});

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [callCount, setCallCount] = useState(0);
  const [blocked, setBlocked] = useState(false);

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
        setLogs(prev => [
          ...prev,
          `Call ${nextCall}: BLOCKED - ${err.guard402.res.reason}`
        ]);
        setBlocked(true);
      } else {
        setLogs(prev => [
          ...prev,
          `Call ${nextCall}: ERROR - ${String(err)}`
        ]);
      }
    }
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

      <div className="mt-4 w-full max-w-xl bg-neutral-900 rounded p-4 text-sm font-mono text-neutral-100">
        {logs.length === 0 ? (
          <div>No calls made yet</div>
        ) : (
          logs.map((l, idx) => <div key={idx}>{l}</div>)
        )}
      </div>
    </main>
  );
}
