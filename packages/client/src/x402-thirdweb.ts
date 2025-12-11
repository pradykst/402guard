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
import {
    ThirdwebClient,
    prepareTransaction,
    sendTransaction,
    waitForReceipt,
} from "thirdweb";
import { Account, Wallet } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";
import { transfer } from "thirdweb/extensions/erc20";

// These are the shapes your guarded client expects
export type PayWithX402Args = {
    quote: X402Quote;
    option: X402AcceptOption;
    originalConfig: AxiosRequestConfig;
    axiosInstance: AxiosInstance;
    // We need the account to sign!
    account?: Account;
    wallet?: Wallet;
};

export type PayWithX402Result = {
    response: AxiosResponse<any>;
    settlement?: X402SettlementMeta;
};

/**
 * Factory that returns a payWithX402 function backed by Thirdweb's
 * x402 client SDK.
 */
export function createThirdwebPayWithX402(opts: {
    client: ThirdwebClient;
    account?: Account; // Global default account if usually single user
    recipientAddress?: string; // Fallback recipient if quote is missing it
}) {
    const { client, account: defaultAccount, recipientAddress } = opts;

    return async function payWithX402Thirdweb(
        args: PayWithX402Args
    ): Promise<PayWithX402Result> {
        const { quote, option, originalConfig, axiosInstance, account: argAccount } = args;

        const account = argAccount || defaultAccount;
        if (!account) {
            throw new Error("No connected account provided for x402 payment");
        }

        try {
            console.log("[x402] Paying with quote:", JSON.stringify(quote, null, 2));
            console.log("[x402] Selected option:", JSON.stringify(option, null, 2));

            // 1. Resolve Chain
            // map option.network (e.g. "avalanche-fuji" or "43113") to chain object
            // For now, assume it's a number or we parse it
            let chainId = 43113; // default fallback
            const numericChain = parseInt(option.network);
            if (!isNaN(numericChain)) {
                chainId = numericChain;
            } else if (option.network === "avalanche-fuji") {
                chainId = 43113;
            }

            const chain = defineChain(chainId);

            // 2. Prepare Transaction
            let transaction;
            const amountWei = BigInt(option.maxAmountRequired);

            // Check if it's a native token payment or ERC20
            // Usually empty asset or 0x000... means native
            const isNative = !option.asset || option.asset === "0x0000000000000000000000000000000000000000";

            if (isNative) {
                transaction = prepareTransaction({
                    chain,
                    client,
                    to: (option.payTo || recipientAddress || "") as `0x${string}`,
                    value: amountWei,
                });
            } else {
                // ERC20 Transfer
                transaction = transfer({
                    contract: {
                        client,
                        chain,
                        address: option.asset,
                    },
                    to: option.payTo,
                    amountWei: amountWei,
                });
            }

            // 3. Send & Wait
            console.log("Sending x402 payment tx...");
            const { transactionHash } = await sendTransaction({
                transaction,
                account,
            });
            console.log("x402 payment tx sent:", transactionHash);

            const receipt = await waitForReceipt({
                client,
                chain,
                transactionHash,
            });

            if (receipt.status !== "success") {
                throw new Error("Transaction reverted");
            }

            // 4. Retry Request with Proof
            // We use the transaction hash as the x-payment token
            const paymentToken = transactionHash;

            const settlement: X402SettlementMeta = {
                success: true,
                transaction: transactionHash,
                network: option.network,
                payer: account.address,
                errorReason: null,
            };

            const finalResponse = await axiosInstance.request({
                ...originalConfig,
                headers: {
                    ...(originalConfig.headers ?? {}),
                    "x-payment": paymentToken,
                },
                validateStatus: () => true,
            });

            return {
                response: finalResponse,
                settlement,
            };

        } catch (e: any) {
            console.error("Thirdweb manual payment failed", e);
            throw new Error(`Payment failed: ${e.message}`);
        }
    };
}
