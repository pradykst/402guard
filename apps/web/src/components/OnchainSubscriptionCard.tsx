"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { useSendTransaction } from "thirdweb/react";
import { client } from "@/lib/thirdwebClient";
import { Guard402SubscriptionsAbi, hashPlanId, isSubscriptionActive } from "@402guard/subscriptions";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

type OnchainSubscriptionCardProps = {
    defaultPlanId?: string;
    title?: string;
    className?: string;
};

export function OnchainSubscriptionCard({
    defaultPlanId = "demo-plan",
    title = "On-chain Subscription",
    className = "",
}: OnchainSubscriptionCardProps) {
    const account = useActiveAccount();
    const { mutate: sendTransaction, isPending: isCreating } = useSendTransaction();

    const [planId, setPlanId] = useState(defaultPlanId);
    const [dailyCapUsd, setDailyCapUsd] = useState("0.03");
    const [periodDays, setPeriodDays] = useState<string | number>(1);
    const [durationDays, setDurationDays] = useState<string | number>(7);

    const [chainStatus, setChainStatus] = useState<{ active: boolean } | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [isChecking, setIsChecking] = useState(false);

    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS;

    async function checkStatus() {
        if (!account) {
            setStatusMessage("Please connect your wallet first.");
            return;
        }

        setIsChecking(true);
        setStatusMessage("Checking status...");
        try {
            const isActive = await isSubscriptionActive({
                user: account.address as `0x${string}`,
                planId,
            });
            setChainStatus({ active: isActive });
            setStatusMessage(isActive ? "Active on chain" : "Not active for this plan");
        } catch (err) {
            console.error(err);
            setStatusMessage("Error checking status");
        } finally {
            setIsChecking(false);
        }
    }

    function handleCreateSubscription() {
        if (!account) {
            setStatusMessage("Connect your wallet first");
            return;
        }
        if (!CONTRACT_ADDRESS) {
            setStatusMessage("Contract address not set");
            return;
        }

        setStatusMessage("Preparing transaction...");

        try {
            const planKey = hashPlanId(planId);
            const now = Math.floor(Date.now() / 1000);
            const durationSeconds = Number(durationDays) * 24 * 60 * 60;
            const expiry = BigInt(now + durationSeconds);

            const contract = getContract({
                client,
                address: CONTRACT_ADDRESS,
                chain: avalancheFuji,
                abi: Guard402SubscriptionsAbi,
            });

            const tx = prepareContractCall({
                contract,
                method: "subscribe",
                params: [account.address as `0x${string}`, planKey, expiry],
            } as any);

            sendTransaction(tx, {
                onSuccess: () => {
                    setStatusMessage("Transaction sent! Waiting for confirmation...");
                    // Optimistic update or wait a bit? Let's check status after a short delay
                    setTimeout(() => {
                        checkStatus();
                    }, 5000);
                },
                onError: (error) => {
                    console.error(error);
                    setStatusMessage("Transaction failed or rejected");
                },
            });

        } catch (err: any) {
            console.error(err);
            setStatusMessage("Error preparing transaction: " + err.message);
        }
    }

    return (
        <Card title={title} className={className}>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Plan ID</label>
                    <input
                        type="text"
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                        Must match the plan ID created by the admin.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Daily Cap ($)</label>
                        <input
                            type="text"
                            value={dailyCapUsd}
                            onChange={(e) => setDailyCapUsd(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm opacity-60 cursor-not-allowed"
                            readOnly
                            title="Fixed by plan"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Period (Days)</label>
                        <input
                            type="number"
                            value={periodDays}
                            onChange={(e) => setPeriodDays(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm opacity-60 cursor-not-allowed"
                            readOnly
                            title="Fixed by plan"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Duration (Days)</label>
                    <input
                        type="number"
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono text-sm"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                        How long this subscription will be valid for.
                    </p>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        {statusMessage && (
                            <p className={`text-sm ${statusMessage.toLowerCase().includes("error") ? "text-red-400" : "text-yellow-400"} animate-pulse`}>
                                {statusMessage}
                            </p>
                        )}
                        {chainStatus && (
                            <p className={`text-sm font-bold ${chainStatus.active ? "text-green-400" : "text-zinc-400"}`}>
                                Last Status: {chainStatus.active ? "ACTIVE" : "INACTIVE"}
                            </p>
                        )}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={checkStatus}
                        disabled={isChecking || !account}
                    >
                        {isChecking ? "Checking..." : "Check Status"}
                    </Button>
                </div>

                <Button
                    variant="primary"
                    className="w-full py-3 text-base font-bold"
                    onClick={handleCreateSubscription}
                    disabled={isCreating || !account}
                >
                    {!account ? "Connect Wallet First" : isCreating ? "Confirm in Wallet..." : "Create Subscription for this Wallet"}
                </Button>
            </div>
        </Card>
    );
}
