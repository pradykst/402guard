import type { Request, Response, NextFunction } from "express";
import {
    isSubscriptionActive,
    recordOnchainUsage,
} from "@402guard/subscriptions";

type RequireSubscriptionOptions = {
    planId: string;
    // optional: where to read the user address from
    addressSource?: "query" | "header";
    headerName?: string; // used when addressSource === "header"
};

/**
 * Express middleware that:
 *  - reads wallet address from request
 *  - checks Guard402Subscriptions on Fuji
 *  - optionally records usage on chain
 */
export function requireSubscription(
    opts: RequireSubscriptionOptions,
) {
    const {
        planId,
        addressSource = "query",
        headerName = "x-wallet",
    } = opts;

    return async function guardSubscription(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            let user: string | undefined;

            if (addressSource === "query") {
                user = (req.query.wallet as string | undefined) ?? undefined;
            } else {
                user = (req.headers[headerName.toLowerCase()] as string | undefined) ?? undefined;
            }

            if (!user) {
                return res.status(401).json({
                    ok: false,
                    error: "wallet_missing",
                    message: "No wallet address provided",
                });
            }

            if (!user.startsWith("0x")) {
                return res.status(400).json({
                    ok: false,
                    error: "wallet_invalid",
                    message: "Wallet must be 0x-prefixed",
                });
            }

            const active = await isSubscriptionActive({
                user: user as `0x${string}`,
                planId,
            });

            if (!active) {
                return res.status(402).json({
                    ok: false,
                    error: "subscription_inactive",
                    planId,
                    message: "Subscription not active for this plan",
                });
            }

            // Optional: record small usage for the call
            try {
                await recordOnchainUsage({
                    user: user as `0x${string}`,
                    planId,
                    usdAmountMicros: BigInt(1_000), // 0.001 USD for demo
                });
            } catch (e) {
                console.warn("recordOnchainUsage failed", e);
            }

            // Attach user to request for handlers
            (req as any).wallet = user;
            next();
        } catch (err) {
            console.error("requireSubscription error", err);
            res.status(500).json({
                ok: false,
                error: "internal_error",
            });
        }
    };
}
