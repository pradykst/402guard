import { createBrowserThirdwebClient } from "./thirdwebClient";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { PayWithX402Args, PayWithX402Result } from "@402guard/client";
import { prepareTransaction, sendTransaction, waitForReceipt, toWei } from "thirdweb";
import { getContract } from "thirdweb/contract";
import { transfer } from "thirdweb/extensions/erc20";

// NOTE: We do not import from thirdweb/x402 to avoid server-only facilitator crashes.

export function createThirdwebPayWithX402(config?: { clientId?: string }): (args: PayWithX402Args) => Promise<PayWithX402Result> {
    const client = createBrowserThirdwebClient(config?.clientId);

    return async function payWithX402({ quote, option, originalConfig, axiosInstance }: PayWithX402Args): Promise<PayWithX402Result> {
        console.log("Paying with x402 (generic tx)...", { quote, option });

        try {
            // option usually contains: { network, to, value/price, tokenAddress? }
            // quote contains: { payTo, ... }

            // 1. Determine Payment Details
            // option.network is string (e.g. "43113" or "avalanche-fuji"). 
            // We assume it can be parsed as a number for defineChain, or is a known slug. 
            // For safety in this dummy, we'll try to parse it or default to a known chain if needed.
            // But defineChain takes a number.
            const chainId = Number(option.network);
            const chain = { id: isNaN(chainId) ? 43113 : chainId, rpc: "https://rpc.ankr.com/avalanche_fuji" } as any;
            // Note: In real app, use defineChain or a map. casting any to bypass strict check for now.

            const to = option.payTo;

            // Amount: prefer simple value if available, else try to parse.
            // 402Guard quotes typically have `price` or `estimatedPrice` (string or number).
            // X402AcceptOption has `maxAmountRequired` (string).

            const value = option.maxAmountRequired;
            const isNative = !option.asset || option.asset === "0x0000000000000000000000000000000000000000";
            const tokenAddress = option.asset;

            // 2. Prepare Transaction using 'thirdweb' core
            let transaction;
            // Native Token Payment (SOL/AVAX/ETH)
            if (isNative) {
                transaction = prepareTransaction({
                    to,
                    value: BigInt(value), // Ensure bigint
                    chain,
                    client,
                });
            } else {
                // ERC20 Payment
                // need contract instance
                const contract = getContract({
                    client,
                    chain,
                    address: tokenAddress,
                });
                transaction = transfer({
                    contract,
                    to,
                    amount: value, // helper parses this if string? or check docs. 
                    // 'transfer' usually takes human readable usually. 
                    // If 'value' is raw wei, we might need a raw 'call'.
                    // For safety in this demo, assuming native AVAX payment like in route.ts ($0.01)
                });

                // Fallback for demo: if it's not native, throw or warn (route.ts sets native price)
                if (!isNative) console.warn("ERC20 not fully implemented in this demo adapter, attempting transfer...");
            }

            if (!transaction) throw new Error("Could not prepare transaction");

            // 3. Send Transaction
            // This expects a connected account context? 
            // In a helper function, we might not have the 'account' object easily if not passed.
            // BUT: `sendTransaction` needs `{ transaction, account }`.
            // The `payWithX402` signature doesn't pass `account`.
            // HOWEVER: We are in the browser. We can try `useActiveAccount`? 
            // No, we are in a pure function, not a hook.

            // Solution: We need the account to sign. 
            // The Thirdweb `pay` helper (which we couldn't load) handled this by assuming a connected wallet in the provider context?
            // Actually, `sendTransaction` with `thirdweb/react` hooks is easy, but here we are in a library function.
            // If we use the raw `thirdweb` SDK, we need an Account object.

            // Wait, we can't easily get the active account from outside React context in Thirdweb v5.
            // THIS is why `useFetchWithPayment` is a HOOK.

            // Alternative:
            // The user's code in `DemoPage` has `useActiveAccount`.
            // We should pass the account to `createThirdwebPayWithX402` or `payWithX402`?
            // `createGuardedAxios` signature is fixed. `payWithX402` takes specific args.

            // Hack/Fix:
            // We can attach `account`to `axiosInstance` or `args`? No, types are strict.
            // We can make `createThirdwebPayWithX402` accept a function to get the account?
            // `createThirdwebPayWithX402(() => activeAccount)`?

            // Re-evaluating:
            // The `settlePayment` on server returns a `paymentUrl` sometimes? No.

            // If I cannot access the signer, I cannot pay.
            // I must modify `DemoClient.tsx` to pass the account to the factory?
            // But `createGuardedAxios` is usually created once.

            // Okay, I will modify `createThirdwebPayWithX402` to accept an `account` in its closure, 
            // OR I will default to assuming there is a way to get it.
            // In Thirdweb v5, you generally pass `account` to `sendTransaction`.

            // I will update the factory to:
            // `export function createThirdwebPayWithX402(params: { clientId?: string, account?: Account }): ...`
            // And In `DemoClient`, I will re-create the guarded client when `account` changes?
            // That's acceptable for a demo.

            // Wait, `DemoClient` imports `guardedAxios` from a static definition in previous code?
            // No, it constructed it inside `X402DemoPage` component? 
            // "We reconstruct this inside the component or outside?" -> I put it *outside* in previous step.
            // I MUST move `createGuardedAxios` *inside* the component to access `account`.

            throw new Error("Missing implementation: account access");
            // Just placeholder to stop here.

        } catch (e) { throw e; }
    }
}
