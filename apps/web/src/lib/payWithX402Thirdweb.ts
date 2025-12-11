import { createBrowserThirdwebClient } from "./thirdwebClient";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { PayWithX402Args, PayWithX402Result } from "@402guard/client";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { avalancheFuji } from "thirdweb/chains"; // fallback

export function createThirdwebPayWithX402(config?: { clientId?: string, account?: Account | null }): (args: PayWithX402Args) => Promise<PayWithX402Result> {
    const client = createBrowserThirdwebClient(config?.clientId);
    const account = config?.account;

    return async function payWithX402({ quote, option, originalConfig, axiosInstance }: PayWithX402Args): Promise<PayWithX402Result> {
        console.log("Paying with x402...", {
            quote: JSON.stringify(quote, null, 2),
            option: JSON.stringify(option, null, 2)
        });

        if (!account) {
            throw new Error("Wallet not connected (no account)");
        }

        try {
            const to = quote.payTo || option.to || quote.recipient;
            let value = option.value || option.price || quote.price || 0;

            // Force chain to be Avalanche Fuji for this demo to avoid mismatches
            // The error "params specify an EIP-1559 transaction..." suggests a mismatch
            // between what prepareTransaction thinks and what the chain def says.
            // Using the official export from thirdweb/chains is safest.
            const chain = avalancheFuji;

            console.log("Tx Details:", {
                to,
                value: value.toString(),
                chain: JSON.stringify(chain, null, 2)
            });

            // Prepare Transaction
            const transaction = prepareTransaction({
                to,
                value: BigInt(value),
                chain,
                client,
            });

            console.log("Sending transaction...");
            // Send
            const { transactionHash } = await sendTransaction({
                transaction,
                account,
            });
            console.log("Tx sent/signed:", transactionHash);

            // Wait for receipt
            console.log("Waiting for receipt...");
            await waitForReceipt({
                client,
                chain,
                transactionHash,
            });
            console.log("Receipt received. Retrying request...");

            // Retry Request
            const headers: Record<string, string> = { ...originalConfig.headers } as Record<string, string>;
            headers["x-payment-token"] = transactionHash;
            headers["x-payment"] = transactionHash;

            console.log("Retrying with headers:", headers);

            const retryResponse = await axiosInstance.request({
                ...originalConfig,
                headers,
            });

            return {
                response: retryResponse,
                settlement: {
                    network: chain?.chainId?.toString(),
                    asset: "native",
                    transaction: transactionHash,
                },
            };

        } catch (err) {
            console.error("Payment or Retry failed", err);
            throw err;
        }
    };
}
