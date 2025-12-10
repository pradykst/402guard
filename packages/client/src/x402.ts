// packages/client/src/x402.ts
import type {
    X402Quote,
    X402AcceptOption,
    X402SettlementMeta,
} from "./types";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
// packages/client/src/x402.ts
import { createThirdwebPayWithX402 } from "./x402-thirdweb";


/**
 * Pick a payment option from an x402 quote.
 * For now: just take the first one.
 */
export function pickFirstOption(quote: X402Quote): X402AcceptOption {
    return quote.accepts[0];
}

/**
 * Convert a quote + option into a USD estimate.
 * For Avalanche USDC later you’ll map smallest unit -> dollars.
 */
export function estimateUsdFromQuote(quote: X402Quote, option: X402AcceptOption) {
    // TODO: real math later – for now keep the demo mental model
    return 0.01;
}

/**
 * Generic “pay then retry original request” helper.
 * This is your reusable payWithX402 implementation.
 */
export async function payWithX402Local<T = any, R = AxiosResponse<T>>(args: {
    quote: X402Quote;
    option: X402AcceptOption;
    originalConfig: AxiosRequestConfig;
    axiosInstance: AxiosInstance;
}): Promise<{ response: R; settlement?: X402SettlementMeta }> {
    const paidConfig: AxiosRequestConfig = {
        ...args.originalConfig,
        headers: {
            ...(args.originalConfig.headers || {}),
            "x-test-payment": "paid",
        },
    };

    const response = await args.axiosInstance.request<T, R>(paidConfig);

    const settlement: X402SettlementMeta = {
        success: true,
        transaction: "0x-demo-tx",
        network: args.option.network,
        payer: "0x-demo-payer",
        errorReason: null,
    };

    return { response, settlement };
}


/**
 * Placeholder for real Avalanche x402 integration.
 * Later:
 *  - read the x402 quote format Avalanche uses
 *  - build the on-chain payment transaction (USDC on Fuji/mainnet)
 *  - wait for confirmation, then retry originalConfig with X-PAYMENT headers
 */
export async function payWithX402Avalanche<T = any, R = AxiosResponse<T>>(args: {
    quote: X402Quote;
    option: X402AcceptOption;
    originalConfig: AxiosRequestConfig;
    axiosInstance: AxiosInstance;
}): Promise<{ response: R; settlement?: X402SettlementMeta }> {
    // TODO: call Avalanche facilitator / wallet here

    // For now just delegate to local stub so nothing breaks
    return payWithX402Local<T, R>(args);
}



// packages/client/src/x402.ts (bottom)

export const payWithX402Thirdweb = createThirdwebPayWithX402({
    facilitatorBaseUrl:
        process.env.THIRDWEB_X402_FACILITATOR_URL ?? "",
    apiKey: process.env.THIRDWEB_X402_API_KEY,
    payerAddress: process.env.THIRDWEB_X402_PAYER_ADDRESS as `0x${string}`,
    chainId: Number(process.env.THIRDWEB_X402_CHAIN_ID ?? "43113"),
});
