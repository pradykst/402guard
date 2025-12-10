// apps/web/src/lib/thirdweb-x402.ts
import { createThirdwebClient } from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { facilitator, settlePayment } from "thirdweb/x402";

if (!process.env.THIRDWEB_SECRET_KEY) {
    throw new Error("THIRDWEB_SECRET_KEY not set");
}

if (!process.env.THIRDWEB_SERVER_WALLET) {
    throw new Error("THIRDWEB_SERVER_WALLET not set");
}

export const X402_CHAIN = avalancheFuji;
export const X402_SERVER_WALLET =
    process.env.THIRDWEB_SERVER_WALLET as `0x${string}`;

export const thirdwebServerClient = createThirdwebClient({
    secretKey: process.env.THIRDWEB_SECRET_KEY,
});

export const thirdwebFacilitator = facilitator({
    client: thirdwebServerClient,
    serverWalletAddress: X402_SERVER_WALLET,
    // optional:
    // waitUntil: "submitted" | "confirmed" | "simulated"
});

// Re export settlePayment so the route can import from one file
export { settlePayment };
