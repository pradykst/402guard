import { NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { arbitrumSepolia } from "thirdweb/chains";

export async function GET(request: Request) {
    try {
        const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
        const SERVER_WALLET = process.env.THIRDWEB_SERVER_WALLET;
        const FACILITATOR_URL = process.env.THIRDWEB_X402_FACILITATOR_URL;

        if (!SECRET_KEY) {
            return NextResponse.json({ error: "Missing THIRDWEB_SECRET_KEY in server env" }, { status: 500 });
        }

        // Create client
        const client = createThirdwebClient({
            secretKey: SECRET_KEY,
        });

        // Initialize facilitator
        const facilitatorArgs: any = { client };

        if (FACILITATOR_URL) {
            facilitatorArgs.facilitatorUrl = FACILITATOR_URL;
        } else if (SERVER_WALLET) {
            facilitatorArgs.serverWalletAddress = SERVER_WALLET;
            // Also set walletAddress for backward compatibility if needed, though serverWalletAddress is standard
            facilitatorArgs.walletAddress = SERVER_WALLET;
        } else {
            return NextResponse.json({ error: "Missing THIRDWEB_SERVER_WALLET (or FACILITATOR_URL) in server env" }, { status: 500 });
        }

        const thirdwebFacilitator = facilitator(facilitatorArgs);

        // Extract payment data
        const paymentData = request.headers.get("x-payment") ?? undefined;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const resourceUrl = `${baseUrl}/api/x402-thirdweb-demo`;
        const PRICE_USD = "0.01";

        // Call settlePayment
        const result = await settlePayment({

            resourceUrl,
            method: "GET",
            paymentData,
            network: arbitrumSepolia,
            price: PRICE_USD,
            facilitator: thirdwebFacilitator,
            routeConfig: {
                description: "402Guard + thirdweb x402 paid demo",
                mimeType: "application/json",
                maxTimeoutSeconds: 60 * 60,
            },
        });

        if (result.status === 200) {
            return NextResponse.json({
                ok: true,
                data: "Guarded premium content from 402Guard + Thirdweb x402",
                message: "Payment verified!",
                priceUsd: PRICE_USD,
            });
        }

        // Return the 402 body exactly as thirdweb expects
        return new NextResponse(
            typeof result.responseBody === "string"
                ? result.responseBody
                : JSON.stringify(result.responseBody),
            {
                status: result.status,
                headers: result.responseHeaders as any,
            },
        );

    } catch (error: any) {
        console.error("x402 settlement error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
