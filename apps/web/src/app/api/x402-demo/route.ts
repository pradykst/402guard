// apps/web/src/app/api/x402-demo/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    createGuardedAxios,
    payWithX402Thirdweb,
    pickFirstOption,
    estimateUsdFromQuote,
} from "@402guard/client";

export const runtime = "nodejs"; // ensure this runs on server

export async function POST(req: NextRequest) {
    const body = await req.json();

    const guarded = createGuardedAxios({
        agentId: "demo-agent-thirdweb",
        subscriptionId: "demo-sub-thirdweb",
        facilitatorId: "thirdweb-x402",
        selectPaymentOption: pickFirstOption,
        estimateUsdFromQuote,
        payWithX402: payWithX402Thirdweb,
    });

    try {
        const resp = await guarded.guardedRequest({
            method: "POST",
            url: body.targetUrl,   // e.g. one of your 402-enabled endpoints
            data: body.payload,
        });

        return NextResponse.json(
            {
                ok: true,
                status: resp.status,
                data: resp.data,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("x402-thirdweb demo error:", err);
        return NextResponse.json(
            {
                ok: false,
                message: err.message,
                guard402: err.guard402 ?? null,
            },
            { status: 500 }
        );
    }
}
