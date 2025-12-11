// import { createBrowserThirdwebClient } from "./thirdwebClient";
// import type { PayWithX402Args, PayWithX402Result } from "@402guard/client";
// import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
// import type { Account } from "thirdweb/wallets";
// import { avalancheFuji } from "thirdweb/chains";

// export function createThirdwebPayWithX402(config?: {
//   clientId?: string;
//   account?: Account | null;
// }): (args: PayWithX402Args) => Promise<PayWithX402Result> {
//   const client = createBrowserThirdwebClient(config?.clientId);
//   const account = config?.account;

//   return async function payWithX402({
//     quote,
//     option,
//     originalConfig,
//     axiosInstance,
//   }: PayWithX402Args): Promise<PayWithX402Result> {
//     if (!account) {
//       throw new Error("Wallet not connected (no account)");
//     }

//     console.log("Paying with x402...", { quote, option });

//     // Some quotes may not have `payTo`; keep it optional and use `any` so TS doesn’t choke
//     const q: any = quote;
//     const to = q.payTo ?? option.to ?? quote.recipient;

//     // Normalise the value into a bigint
//     let value: any = option.value ?? option.price ?? quote.price ?? 0;
//     let valueBigInt: bigint;
//     if (typeof value === "bigint") {
//       valueBigInt = value;
//     } else if (typeof value === "string") {
//       valueBigInt = BigInt(value);
//     } else {
//       valueBigInt = BigInt(Math.floor(Number(value)));
//     }

//     // Force Avalanche Fuji for the demo
//     const chain: any = avalancheFuji;

//     console.log("Tx Details:", {
//       to,
//       value: valueBigInt.toString(),
//       chain,
//     });

//     const transaction = prepareTransaction({
//       to,
//       value: valueBigInt,
//       chain,
//       client,
//     });

//     console.log("Sending transaction...");
//     const { transactionHash } = await sendTransaction({
//       transaction,
//       account,
//     });
//     console.log("Tx sent:", transactionHash);

//     console.log("Waiting for receipt...");
//     await waitForReceipt({
//       client,
//       chain,
//       transactionHash,
//     });
//     console.log("Receipt received, retrying original request...");

//     const headers: Record<string, string> = {
//       ...(originalConfig.headers as Record<string, string>),
//       "x-payment-token": transactionHash,
//       "x-payment": transactionHash,
//     };

//     const retryResponse = await axiosInstance.request({
//       ...originalConfig,
//       headers,
//     });

//     return {
//       response: retryResponse,
//       settlement: {
//         // thirdweb chains usually expose `id`; fall back to quote.chainId if present
//         network: String(q.chainId ?? chain.id ?? ""),
//         asset: "native",
//         transaction: transactionHash,
//       },
//     };
//   };
// }
