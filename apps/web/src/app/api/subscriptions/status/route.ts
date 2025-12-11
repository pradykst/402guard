
import { NextResponse } from "next/server";
import { getSubscriptionStatus } from "@402guard/subscriptions";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const planId = searchParams.get("planId");

    if (!wallet || !planId) {
        return NextResponse.json(
            { error: "Missing wallet or planId" },
            { status: 400 }
        );
    }

    try {
        const result = await getSubscriptionStatus({
            user: wallet as `0x${string}`,
            planId,
        });
        return NextResponse.json({ active: result.active });
    } catch (error: any) {
        console.error("Error checking subscription status:", error);
        return NextResponse.json(
            { error: "Failed to check subscription status", details: error.message },
            { status: 500 }
        );
    }
}
