// apps/web/src/app/api/x402-thirdweb-demo/route.ts
import { NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { avalancheFuji } from "thirdweb/chains";

export async function GET(request: Request) {
    try {
        const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
        // Client ID is optional on server if secret key is present
        const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
        // User reports facilitator URL might not be needed
        const FACILITATOR_URL = process.env.THIRDWEB_X402_FACILITATOR_URL;
        // Wallet address to receive funds (required if no facilitator URL)
        const SERVER_WALLET = process.env.THIRDWEB_SERVER_WALLET;

        if (!SECRET_KEY) {
            return NextResponse.json({ error: "Missing THIRDWEB_SECRET_KEY in server env" }, { status: 500 });
        }

        // This runs on the server only
        const client = createThirdwebClient({
            secretKey: SECRET_KEY,
        });

        // Construct facilitator args dynamically
        const facilitatorArgs: any = { client };

        if (FACILITATOR_URL) {
            facilitatorArgs.facilitatorUrl = FACILITATOR_URL;
        } else if (SERVER_WALLET) {
            const wallet = SERVER_WALLET.trim();
            // Provide BOTH property names to be safe against SDK version differences
            facilitatorArgs.serverWalletAddress = wallet;
            facilitatorArgs.walletAddress = wallet;
        } else {
            return NextResponse.json({ error: "Missing THIRDWEB_SERVER_WALLET (or FACILITATOR_URL) in server env" }, { status: 500 });
        }

        const thirdwebFacilitator = facilitator(facilitatorArgs);

        // For the demo: fixed price per call
        const PRICE_USD = "0.01";

        // 1. Read payment data (if any) from headers
        const paymentDataHeader = request.headers.get("x-payment");
        const paymentData = paymentDataHeader ? paymentDataHeader : undefined;

        if (paymentData) {
            console.log("Debug: received x-payment header (length):", paymentData.length);

            // MANUAL VERIFICATION: If it looks like a tx hash, verify it directly
            if (paymentData.startsWith("0x") && paymentData.length === 66) {
                console.log("Debug: Verifying transaction hash:", paymentData);
                try {
                    const { getTransaction, waitForReceipt } = await import("thirdweb");
                    const { defineChain } = await import("thirdweb/chains");

                    // Assuming Avalanche Fuji for demo
                    const chain = defineChain(43113);

                    // 1. Wait for receipt to ensure it's mined
                    await waitForReceipt({
                        client,
                        chain,
                        transactionHash: paymentData as `0x${string}`,
                    });

                    // 2. Get transaction details to check value/recipient
                    // @ts-ignore
                    const tx = await getTransaction({
                        client,
                        chain,
                        transactionHash: paymentData as `0x${string}`,
                    });

                    const expectedWallet = facilitatorArgs.serverWalletAddress || facilitatorArgs.walletAddress;

                    // Check if paid roughly enough (or just > 0 for demo)
                    // In production, check tx.value >= price
                    if (expectedWallet && tx.to?.toLowerCase() === expectedWallet.toLowerCase()) {
                        console.log("Debug: Payment verified manually via tx hash");
                        return NextResponse.json({
                            ok: true,
                            data: "Guarded premium content from 402Guard + Thirdweb x402",
                            message: "Payment verified!",
                            priceUsd: PRICE_USD,
                        });
                    } else {
                        console.warn("Debug: Tx recipient mismatch", tx.to, expectedWallet);
                    }
                } catch (err: any) {
                    console.error("Debug: Manual verification failed", err.message);
                }
            }
        }

        // 2. Determine resource URL (must match exactly what client sees)
        // In dev, usually http://localhost:3000/api/x402-thirdweb-demo
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const resourceUrl = `${baseUrl}/api/x402-thirdweb-demo`;

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
            console.log("Debug: Payment verified, returning content");
            // Payment settled, return your paid work
            return NextResponse.json({
                ok: true,
                data: "Guarded premium content from 402Guard + Thirdweb x402",
                message: "Payment verified!",
                priceUsd: PRICE_USD,
            });
        }

        // Initial call or failed payment → bubble up 402 payload
        // FIX: Manually stringify to avoid [object Object] coercion issues
        const bodyContent = result.responseBody;
        console.log("Debug: responseBody type:", typeof bodyContent);

        let finalBody = bodyContent;
        if (typeof bodyContent === 'object' && bodyContent !== null) {
            finalBody = JSON.stringify(bodyContent);
        } else if (typeof bodyContent === 'string') {
            finalBody = bodyContent;
        } else if (bodyContent === undefined || bodyContent === null) {
            finalBody = "";
        } else {
            finalBody = String(bodyContent);
        }

        return new NextResponse(finalBody as BodyInit, {
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
