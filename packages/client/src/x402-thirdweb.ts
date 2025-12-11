// packages/client/src/x402-thirdweb.ts
import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from "axios";
import type {
    X402Quote,
    X402AcceptOption,
    X402SettlementMeta,
} from "./types";
import {
    createThirdwebClient,
    ThirdwebClient,
} from "thirdweb";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { createWallet, Wallet } from "thirdweb/wallets";

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
 * Creates a payment handler that uses Thirdweb's x402 integration.
 * Allows passing an existing client and wallet to share context (e.g. from React provider).
 */
export function createPayWithX402Thirdweb(params?: {
    client?: ThirdwebClient;
    wallet?: Wallet;
}) {
    return async function payWithX402Thirdweb(
        args: PayWithX402Args
    ): Promise<PayWithX402Result> {
        const { originalConfig } = args;

        // Use passed client or create new one
        const client = params?.client ?? createThirdwebClient({
            clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
        });

        // Use passed wallet or create new one (MetaMask)
        let wallet = params?.wallet;

        if (!wallet) {
            // Fallback: create a new socket connection to MetaMask
            wallet = createWallet("io.metamask");
            // Only connect if we created it ourselves and it's not connected
            // Note: wallet.connect() might prompt the user
            await wallet.connect({ client });
        }

        // Wrap fetch with payment handling
        const fetchWithPayment = wrapFetchWithPayment(
            globalThis.fetch.bind(globalThis),
            client,
            wallet,
            {
                // Optional: set maxValue based on args.option/quote if needed
            }
        );

        // Build URL from original Axios config
        const url =
            originalConfig.baseURL
                ? new URL(originalConfig.url ?? "", originalConfig.baseURL).toString()
                : (originalConfig.url ?? "");

        const method = (originalConfig.method ?? "GET").toUpperCase();
        const headers = new Headers(originalConfig.headers as any);

        let body: BodyInit | undefined;
        if (originalConfig.data != null) {
            body =
                typeof originalConfig.data === "string"
                    ? originalConfig.data
                    : JSON.stringify(originalConfig.data);
            if (!headers.has("content-type")) {
                headers.set("content-type", "application/json");
            }
        }

        console.log("[x402] Payment flow started via thirdweb SDK...");

        // This will:
        // 1. Call the API
        // 2. Intercept 402
        // 3. Prompt user to pay/sign via wallet
        // 4. Retry with x-payment header
        const res = await fetchWithPayment(url, { method, headers, body });

        // Convert Fetch Response -> AxiosResponse
        const dataText = await res.text();
        const data =
            res.headers.get("content-type")?.includes("application/json")
                ? JSON.parse(dataText || "{}")
                : dataText;

        const axiosResponse: AxiosResponse<any> = {
            data,
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            config: originalConfig as InternalAxiosRequestConfig,
            request: {},
        };

        // x402 settlement meta is not explicitly returned by wrapFetchWithPayment yet
        // Budgets are handled by 402Guard prior to this call.
        return { response: axiosResponse, settlement: undefined };
    };
}
