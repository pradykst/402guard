// packages/server/src/index.ts
import type { Request, Response, NextFunction } from "express";
import { isSubscriptionActive } from "@402guard/subscriptions";

// Options for the Express middleware
export type SubscriptionGuardOptions = {
    planId: string;

    // Optional: custom way to extract the user address from the request
    getWalletAddress?(req: Request): string | null;
};

// Default wallet extractor:
// - first looks at ?wallet=0x...
// - then at "x-wallet-address" header
function defaultGetWalletAddress(req: Request): string | null {
    const fromQuery = req.query.wallet;
    if (typeof fromQuery === "string" && fromQuery.startsWith("0x")) {
        return fromQuery;
    }

    const fromHeader = req.header("x-wallet-address");
    if (fromHeader && fromHeader.startsWith("0x")) {
        return fromHeader;
    }

    return null;
}

/**
 * Express middleware factory that checks if a user is subscribed
 * to the given planId using the on chain Guard402Subscriptions contract.
 */
export function requireSubscription(options: SubscriptionGuardOptions) {
    const { planId, getWalletAddress = defaultGetWalletAddress } = options;

    return async function subscriptionGuard(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const wallet = getWalletAddress(req);

            if (!wallet) {
                return res.status(400).json({
                    ok: false,
                    error: "Missing wallet address (?wallet or x-wallet-address header)"
                });
            }

            const active = await isSubscriptionActive({
                user: wallet as `0x${string}`,
                planId
            });

            if (!active) {
                return res.status(402).json({
                    ok: false,
                    error: "Subscription inactive for this plan",
                    planId,
                    wallet
                });
            }

            // All good, continue to the handler
            return next();
        } catch (err) {
            console.error("requireSubscription error", err);
            return res.status(500).json({
                ok: false,
                error: "Internal subscription check error"
            });
        }
    };
}

// Re export the low level helper as well so people can call it directly if needed
export { isSubscriptionActive };
