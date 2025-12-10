// apps/web/src/app/api/x402-thirdweb-demo/route.ts
import { NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { avalancheFuji } from "thirdweb/chains";

const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
const FACILITATOR_URL = process.env.THIRDWEB_X402_FACILITATOR_URL;

if (!SECRET_KEY) {
    throw new Error("Missing THIRDWEB_SECRET_KEY");
}
if (!CLIENT_ID) {
    // Not strictly required for server-only x402 if secret key is present, but good for consistency
    console.warn("Missing THIRDWEB_CLIENT_ID in server env");
}
if (!FACILITATOR_URL) {
    throw new Error("Missing THIRDWEB_X402_FACILITATOR_URL");
}

// This runs on the server only
const client = createThirdwebClient({
    secretKey: SECRET_KEY,
});

const thirdwebFacilitator = facilitator({
    client,
    // The facilitator URL from the dashboard
    facilitatorUrl: FACILITATOR_URL,
});

// For the demo: fixed price per call
const PRICE_USD = "0.01";

export async function GET(request: Request) {
    // 1. Read payment data (if any) from headers
    const paymentDataHeader = request.headers.get("x-payment");
    const paymentData = paymentDataHeader ? paymentDataHeader : undefined;

    // 2. Determine resource URL (must match exactly what client sees)
    // In dev, usually http://localhost:3000/api/x402-thirdweb-demo
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resourceUrl = `${baseUrl}/api/x402-thirdweb-demo`;

    try {
        const result = await settlePayment({
            client,
            resourceUrl,
            method: "GET",
            paymentData,
            network: avalancheFuji,
            price: PRICE_USD,
            facilitator: thirdwebFacilitator,
            routeConfig: {
                description: "402Guard + Thirdweb x402 paid demo",
                mimeType: "application/json",
            },
        });

        if (result.status === 200) {
            // Payment settled, return your paid work
            return NextResponse.json({
                ok: true,
                data: "Guarded premium content from 402Guard + Thirdweb x402",
                message: "Payment verified!",
                priceUsd: PRICE_USD,
            });
        }

        // Initial call or failed payment → bubble up 402 payload
        return new NextResponse(result.responseBody as any, {
            status: result.status,
            headers: result.responseHeaders as any,
        });
    } catch (error: any) {
        console.error("x402 settlement error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
