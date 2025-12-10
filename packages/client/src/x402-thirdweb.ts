// packages/client/src/x402-thirdweb.ts
import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
} from "axios";
import type {
    X402Quote,
    X402AcceptOption,
    X402SettlementMeta,
} from "./types";

// These are the shapes your guarded client expects
export type PayWithX402Args = {
    quote: X402Quote;
    option: X402AcceptOption;
    originalConfig: AxiosRequestConfig;
    axiosInstance: AxiosInstance;
};

export type PayWithX402Result = {
    response: AxiosResponse<any>;
    settlement?: X402SettlementMeta;
};

/**
 * Factory that returns a payWithX402 function backed by Thirdweb's
 * x402 facilitator.
 *
 * All Thirdweb-specific config lives in this closure.
 */
export function createThirdwebPayWithX402(opts: {
    facilitatorBaseUrl: string;      // e.g. https://x402.thirdweb.xyz  (placeholder)
    apiKey?: string;                 // if Thirdweb requires auth
    payerAddress: `0x${string}`;     // wallet that actually pays
    chainId: number;                 // 43113 for Fuji
}) {
    const { facilitatorBaseUrl, apiKey, payerAddress, chainId } = opts;

    // Optional label, only for logs/analytics
    const FACILITATOR_URL =
        process.env.THIRDWEB_X402_FACILITATOR_URL ?? "thirdweb-facilitator";


    return async function payWithX402Thirdweb(
        args: PayWithX402Args
    ): Promise<PayWithX402Result> {
        const { quote, option, originalConfig, axiosInstance } = args;

        // 1) Ask Thirdweb to pay this quote
        // NOTE: shape of this body and response WILL depend on Thirdweb’s docs.
        // Treat everything here as a template to adapt.
        const payRes = await axiosInstance.post(
            `${facilitatorBaseUrl}/pay`,
            {
                quote,
                option,        // or option.id / option.quoteId – adjust to their spec
                payer: payerAddress,
                chainId,
            },
            {
                headers: apiKey
                    ? { Authorization: `Bearer ${apiKey}` }
                    : undefined,
                // ensure 4xx don’t throw so we can see facilitator errors
                validateStatus: () => true,
            }
        );

        if (payRes.status >= 400) {
            throw new Error(
                `Thirdweb x402 facilitator error ${payRes.status}: ${JSON.stringify(
                    payRes.data
                )}`
            );
        }

        const settlement: X402SettlementMeta | undefined =
            payRes.data.settlement;

        const paymentHeaders =
            payRes.data.paymentHeaders ??
            payRes.data.headers ??
            {};

        // 2) Retry original API call with the x402 payment header(s)
        const finalResponse = await axiosInstance.request({
            ...originalConfig,
            headers: {
                ...(originalConfig.headers ?? {}),
                ...paymentHeaders,
            },
        });

        return {
            response: finalResponse,
            settlement,
        };
    };
}
