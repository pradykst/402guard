import Link from "next/link";
import { ArrowRight, ShieldCheck, CreditCard, Activity, Terminal } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-teal-500/30">

      {/* Hero Section */}
      <section className="relative px-4 py-24 md:py-32 overflow-hidden">
        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Live on Avalanche Fuji
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-br from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
            402Guard
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            The missing layer for 402 Payment Required APIs. <br />
            Add <strong>budgets</strong>, <strong>subscriptions</strong>, and <strong>analytics</strong> to your autonomous agents & AI apps.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/x402-demo"
              className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
            >
              View x402 Live Demo <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/subscriptions-demo"
              className="w-full sm:w-auto px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-bold text-lg border border-neutral-700 transition-all"
            >
              Check Subscriptions
            </Link>
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Code Snippet */}
      <section className="px-4 pb-24">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
              <div className="ml-2 text-xs font-mono text-neutral-500">agent.ts</div>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed">
                <span className="text-purple-400">const</span> guardedAxios = <span className="text-blue-400">createGuardedAxios</span>({`{`}
                {'\n'}  <span className="text-neutral-400">// Define caps to prevent draining wallets</span>
                {'\n'}  policies: {'{'}
                {'\n'}    global: {'{'} <span className="text-teal-400">dailyUsdCap</span>: <span className="text-orange-400">5.00</span> {'}'}
                {'\n'}  {'}'}
                {`\n`});
                {'\n'}
                {'\n'}<span className="text-neutral-500">// Automatically handles 402 responses & pays via Thirdweb</span>
                {'\n'}<span className="text-purple-400">const</span> res = <span className="text-purple-400">await</span> guardedAxios.<span className="text-blue-400">guardedRequest</span>({`{`}
                {'\n'}  url: <span className="text-green-400">"/api/premium-data"</span>
                {`\n`}});
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-24 bg-neutral-800/20 border-y border-neutral-800">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShieldCheck className="w-8 h-8 text-teal-400" />}
              title="Guarded Clients"
              description="Wrap Axios or Fetch with client-side budgets. Prevent your AI agents from accidentally spending $1000 on API calls."
            />
            <FeatureCard
              icon={<CreditCard className="w-8 h-8 text-purple-400" />}
              title="On-Chain Subscriptions"
              description="Token-gated access using Avalanche. Users buy a subscription NFT, and the SDK verifies it automatically."
            />
            <FeatureCard
              icon={<Activity className="w-8 h-8 text-blue-400" />}
              title="Thirdweb Integration"
              description="Seamlessly handles HTTP 402 Payment Required headers using Thirdweb's x402 standard for per-request payments."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-12">How it works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-neutral-400">
            <div className="p-6 bg-neutral-800 rounded-xl border border-neutral-700 w-full md:w-64">
              <Terminal className="w-10 h-10 mx-auto mb-4 text-white" />
              <div className="font-semibold text-white mb-2">Your App</div>
              <div className="text-sm">Initiates request</div>
            </div>
            <ArrowRight className="hidden md:block w-6 h-6 rotate-90 md:rotate-0" />
            <div className="p-6 bg-teal-900/20 rounded-xl border border-teal-500/30 w-full md:w-64 relative overflow-hidden">
              <div className="absolute inset-0 bg-teal-500/5"></div>
              <ShieldCheck className="w-10 h-10 mx-auto mb-4 text-teal-400 relative z-10" />
              <div className="font-semibold text-teal-300 mb-2 relative z-10">402Guard</div>
              <div className="text-sm relative z-10">Enforces budget & pays</div>
            </div>
            <ArrowRight className="hidden md:block w-6 h-6 rotate-90 md:rotate-0" />
            <div className="p-6 bg-neutral-800 rounded-xl border border-neutral-700 w-full md:w-64">
              <div className="text-4xl font-bold text-white mb-4 leading-none">API</div>
              <div className="font-semibold text-white mb-2">Service Grid</div>
              <div className="text-sm">Receives payment</div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="px-4 py-16 border-t border-neutral-800">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-xl font-bold mb-8 text-center text-neutral-500 uppercase tracking-widest">SDK Packages</h3>
          <div className="grid gap-4">
            <PackageRow name="@402guard/client" desc="Core client for budget enforcement & analytics" />
            <PackageRow name="@402guard/subscriptions" desc="Smart contract hooks for Avalanche subscriptions" />
            <PackageRow name="@402guard/server" desc="Server-side validation utilities" />
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-neutral-600 text-sm">
        Built for the QuickNode & Thirdweb Hackathon • 402Guard
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-8 bg-neutral-800/30 hover:bg-neutral-800/50 border border-neutral-800 rounded-xl transition-all hover:-translate-y-1">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-neutral-400 leading-relaxed">{description}</p>
    </div>
  )
}

function PackageRow({ name, desc }: { name: string, desc: string }) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg gap-4">
      <code className="text-teal-400 font-mono">{name}</code>
      <span className="text-neutral-500 text-sm text-center md:text-right">{desc}</span>
    </div>
  )
}
