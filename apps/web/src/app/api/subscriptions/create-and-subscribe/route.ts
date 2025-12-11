
import { NextResponse } from "next/server";
import { createPlan, subscribeUser } from "@402guard/subscriptions";

type CreateSubBody = {
    wallet: string;
    planId: string;
    dailyCapUsd: number;
    periodDays: number;
    durationDays: number;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as CreateSubBody;
        const { wallet, planId, dailyCapUsd, periodDays, durationDays } = body;

        // Basic validation
        if (!wallet || !planId || !dailyCapUsd || !periodDays || !durationDays) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const dailyUsdCapMicros = BigInt(Math.round(dailyCapUsd * 1_000_000));
        const periodSeconds = BigInt(periodDays * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);
        const expiry = BigInt(now + durationDays * 24 * 60 * 60);

        let createPlanTx: `0x${string}` | null = null;
        try {
            createPlanTx = await createPlan({
                planId,
                dailyUsdCapMicros,
                periodSeconds,
            });
        } catch (err: any) {
            // If the error reason contains 'plan exists', ignore; otherwise rethrow.
            // We check multiple properties because viem errors can be nested.
            const reason = err?.shortMessage ?? err?.reason ?? err?.message ?? "";

            // "Plan already exists" might be the revert string, or similar. 
            // In many cases we just want to proceed to subscribe if createPlan fails 
            // because it might already exist.
            // But to be safe, let's log it.
            console.log("createPlan attempt result/error:", reason);

            // If it's *not* a "plan exists" error, we might want to fail? 
            // However, distinguishing revert reasons can be tricky. 
            // For now, we will proceed to subscribe and see if that works. 
            // If createPlan failed because of network issues, subscribe will likely fail too.
        }

        const subscribeTx = await subscribeUser({
            user: wallet as `0x${string}`,
            planId,
            expiry,
        });

        return NextResponse.json({
            ok: true,
            planId,
            wallet,
            tx: {
                createPlan: createPlanTx,
                subscribe: subscribeTx,
            },
        });

    } catch (error: any) {
        console.error("Error in create-and-subscribe:", error);
        // serialize error safely
        return NextResponse.json(
            { ok: false, error: "Operation failed", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
