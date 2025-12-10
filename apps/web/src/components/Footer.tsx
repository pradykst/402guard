import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-zinc-800 bg-[#0a0a0a] py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-zinc-500">
                    Independent x402 tooling for everyone
                </div>
                <div className="flex items-center gap-6">
                    <Link href="https://github.com/pradykst/402guard" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                        GitHub
                    </Link>
                    <Link href="/docs" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                        View Docs
                    </Link>
                </div>
            </div>
        </footer>
    );
}
