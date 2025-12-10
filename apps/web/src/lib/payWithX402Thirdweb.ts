import { createBrowserThirdwebClient } from "./thirdwebClient";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { PayWithX402Args, PayWithX402Result } from "@402guard/client";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import type { Account } from "thirdweb/wallets";

export function createThirdwebPayWithX402(config?: { clientId?: string, account?: Account | null }): (args: PayWithX402Args) => Promise<PayWithX402Result> {
    const client = createBrowserThirdwebClient(config?.clientId);
    const account = config?.account;

    return async function payWithX402({ quote, option, originalConfig, axiosInstance }: PayWithX402Args): Promise<PayWithX402Result> {
        console.log("Paying with x402...", { quote, option });

        if (!account) {
            throw new Error("Wallet not connected (no account)");
        }

        try {
            // option contains: { network, value, ... }
            // quote contains: { payTo }
            // option from 402Guard + Thirdweb usually has 'value' as string (wei) or similar.
            // The route.ts set price to "0.01" (string). Is that ETH or Wei?
            // "const PRICE_USD = '0.01';" in route.ts.
            // SettlePayment creates a quote.
            // Thirdweb's `settlePayment` usually puts the required native amount in `value`.

            // Let's assume quote.options[0].value contains the Wei amount.
            // OR option.value.

            const to = quote.payTo || option.to || quote.recipient;
            const value = option.value || option.price || quote.price || 0;
            const chain = option.network;

            console.log("Tx Details:", { to, value, chain });

            // Prepare Transaction
            const transaction = prepareTransaction({
                to,
                value: BigInt(value),
                chain,
                client,
            });

            // Send
            const { transactionHash } = await sendTransaction({
                transaction,
                account,
            });
            console.log("Tx sent:", transactionHash);

            // Wait for receipt (optional but safer for x402 immediate retry)
            await waitForReceipt({
                client,
                chain,
                transactionHash,
            });

            // Retry Request
            const headers: Record<string, string> = { ...originalConfig.headers } as Record<string, string>;
            headers["x-payment-token"] = transactionHash; // Standard way for 402Guard default
            headers["x-payment"] = transactionHash;       // Route.ts checks this

            const retryResponse = await axiosInstance.request({
                ...originalConfig,
                headers,
            });

            return {
                response: retryResponse,
                settlement: {
                    network: chain?.chainId?.toString(),
                    asset: "native", // Todo: detect token
                    transaction: transactionHash,
                },
            };

        } catch (err) {
            console.error("Payment or Retry failed", err);
            throw err;
        }
    };
}
