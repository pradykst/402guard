import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    // If there is an "x-test-payment" header, treat this as paid and return 200.
    const paidHeader = req.headers.get("x-test-payment");

    if (!paidHeader) {
        // First phase: return an HTTP 402 with an x402-style quote payload.
        // We keep it minimal, just enough for our demo hooks.
        const quote = {
            x402Version: 1,
            accepts: [
                {
                    scheme: "exact",
                    network: "avalanche-fuji",
                    maxAmountRequired: "1000000", // e.g. 1.000000 USDC
                    payTo: "0xDEMO_MERCHANT",
                    asset: "USDC",
                    resource: "demo-fake402-endpoint",
                },
            ],
        };

        return NextResponse.json(quote, { status: 402 });
    }

    // Second phase: simulate a successful paid response.
    return NextResponse.json(
        {
            ok: true,
            message: "Fake 402 resource accessed after payment",
            ts: Date.now(),
        },
        { status: 200 }
    );
}
