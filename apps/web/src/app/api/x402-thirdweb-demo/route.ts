// apps/web/src/app/api/x402-thirdweb-demo/route.ts
import { NextResponse } from "next/server";

import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { avalancheFuji } from "thirdweb/chains";

// This runs on the server only
const client = createThirdwebClient({
    secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
    client,
    serverWalletAddress: process.env.X402_SERVER_WALLET!, // where money goes
});

// For the demo: fixed price per call
const PRICE_USD = "$0.01";

export async function GET(request: Request) {
    const paymentData = request.headers.get("x-payment") || undefined;

    // This resourceUrl should match how the client calls it
    const resourceUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/x402-thirdweb-demo`;

    const result = await settlePayment({
        resourceUrl,
        method: "GET",
        paymentData,
        payTo: process.env.X402_SERVER_WALLET!,
        network: avalancheFuji,
        price: PRICE_USD,
        facilitator: thirdwebFacilitator,
        routeConfig: {
            description: "402Guard + thirdweb x402 paid demo endpoint",
            mimeType: "application/json",
        },
    });

    if (result.status === 200) {
        // Payment settled, return your paid work
        return NextResponse.json({
            ok: true,
            message: "Hello from a real thirdweb x402 paid endpoint on Avalanche Fuji",
            priceUsd: PRICE_USD,
        });
    }

    // Initial call or failed payment → bubble up 402 payload
    return new NextResponse(result.responseBody as any, {
        status: result.status,
        headers: result.responseHeaders as any,
    });
}
