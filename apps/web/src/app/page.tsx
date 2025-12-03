"use client";

import { createGuardedClient } from "@402guard/client";

const client = createGuardedClient({
  policies: {
    global: {
      dailyUsdCap: 10,
    },
    services: {
      "api.example.com": {
        dailyUsdCap: 4,
        requestsPerMinute: 30,
      },
    },
  },
});

export default function HomePage() {
  const message = client.hello();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">402Guard demo</h1>
      <p className="text-lg text-gray-600">{message}</p>
      <pre className="mt-4 text-sm bg-gray-100 p-4 rounded">
        {JSON.stringify(client.options.policies, null, 2)}
      </pre>
    </main>
  );
}
