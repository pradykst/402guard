import { createPublicClient, createWalletClient, http } from "viem";
import { avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import type { Abi } from "viem";
import Guard402SubscriptionsJson from "./abi/Guard402Subscriptions.json";

// this is the actual ABI array that viem wants
export const Guard402SubscriptionsAbi =
    Guard402SubscriptionsJson.abi as Abi;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS as `0x${string}`;

if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS not set");
}

// read-only client (can be used in backend or scripts)
export const subscriptionsClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(process.env.AVALANCHE_FUJI_RPC),
});

// write client (only use in backend/CLI, never in browser)
function getWalletClient() {
    const pk = process.env.GUARD402_BILLING_PK;
    if (!pk) {
        throw new Error("GUARD402_BILLING_PK missing");
    }

    const account = privateKeyToAccount(pk as `0x${string}`);

    return createWalletClient({
        account,
        chain: avalancheFuji,
        transport: http(process.env.AVALANCHE_FUJI_RPC),
    });
}

// small helper: convert planId string -> bytes32
export function hashPlanId(planId: string): `0x${string}` {
    // viem has built-in keccak256 over utf8
    const { keccak256, toHex } = require("viem") as typeof import("viem");
    return keccak256(toHex(planId, { size: 32 })) as `0x${string}`;
}

// ---- Read methods ----

export async function isSubscriptionActive(args: {
    user: `0x${string}`;
    planId: string;
}): Promise<boolean> {
    const planKey = hashPlanId(args.planId);

    return subscriptionsClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: Guard402SubscriptionsAbi,
        functionName: "isActive",
        args: [args.user, planKey],
    }) as Promise<boolean>;
}

export async function getSubscriptionStatus(args: {
    user: `0x${string}`;
    planId: string;
}): Promise<{ active: boolean }> {
    const active = await isSubscriptionActive(args);
    return { active };
}


// ---- Write methods ----

export async function createPlan(args: {
    planId: string;
    dailyUsdCapMicros: bigint;
    periodSeconds: bigint;
}) {
    const planKey = hashPlanId(args.planId);
    const wallet = getWalletClient();

    return wallet.writeContract({
        address: CONTRACT_ADDRESS,
        abi: Guard402SubscriptionsAbi,
        functionName: "createPlan",
        args: [planKey, args.dailyUsdCapMicros, args.periodSeconds],
    });
}

export async function subscribeUser(args: {
    user: `0x${string}`;
    planId: string;
    expiry: bigint;
}) {
    const planKey = hashPlanId(args.planId);
    const wallet = getWalletClient();

    return wallet.writeContract({
        address: CONTRACT_ADDRESS,
        abi: Guard402SubscriptionsAbi,
        functionName: "subscribe",
        args: [args.user, planKey, args.expiry],
    });
}

export async function recordOnchainUsage(args: {
    user: `0x${string}`;
    planId: string;
    usdAmountMicros: bigint;
}) {
    const planKey = hashPlanId(args.planId);
    const wallet = getWalletClient();

    return wallet.writeContract({
        address: CONTRACT_ADDRESS,
        abi: Guard402SubscriptionsAbi,
        functionName: "recordUsage",
        args: [args.user, planKey, args.usdAmountMicros],
    });
}



