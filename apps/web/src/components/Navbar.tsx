import Link from 'next/link';
import { Button } from './Button';

export function Navbar() {
    return (
        <nav className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="font-bold text-xl tracking-tight text-white">
                        402Guard
                    </Link>
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            Home
                        </Link>
                        <Link href="/x402-demo" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            x402 Demo
                        </Link>
                        <Link href="/subscriptions-demo" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            Subscriptions Demo
                        </Link>
                        <Link href="/analytics" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            Analytics
                        </Link>
                        <Link href="https://github.com/pradykst/402guard" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            GitHub
                        </Link>
                    </div>
                </div>
                <div>
                    {/* Fallback to View Demo if connect not available globally */}
                    <Link href="/x402-demo">
                        <Button variant="outline" size="sm">
                            View Demo
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
