import {
    createGuardedAxios,
    type GuardedAxiosOptions,
    type UsageStore,
} from "@402guard/client";

/**
 * Per-subscription Axios options.
 * We extend GuardedAxiosOptions with a required subscriptionId.
 */
export type SubscriptionAxiosOptions = GuardedAxiosOptions & {
    subscriptionId: string;
};

/**
 * Wrap createGuardedAxios so every request is tagged with subscriptionId.
 * We also default agentId = subscriptionId so existing agent analytics work.
 */
export function createSubscriptionAxios(opts: SubscriptionAxiosOptions) {
    const { subscriptionId, agentId, ...rest } = opts;

    return createGuardedAxios({
        ...rest,
        agentId: agentId ?? subscriptionId,
        subscriptionId,
    });
}


export {
    isSubscriptionActive,
    createPlan,
    subscribeUser,
    recordOnchainUsage,
    hashPlanId,
    getSubscriptionStatus,
    subscriptionsClient
} from "./chain";





// ---------- Invoice model ----------

export type InvoiceLine = {
    serviceId: string;
    count: number;
    totalUsd: number;
};

export type Invoice = {
    subscriptionId: string;
    periodStart: string;   // ISO string
    periodEnd: string;     // ISO string
    generatedAt: string;   // ISO string
    currency: "USD";
    lines: InvoiceLine[];
    totalUsd: number;
};

/**
 * Build an invoice for a given subscription and time window.
 */
export function generateInvoice(opts: {
    store: UsageStore;
    subscriptionId: string;
    periodStart: Date;
    periodEnd: Date;
}): Invoice {
    const { store, subscriptionId, periodStart, periodEnd } = opts;

    const fromTs = periodStart.getTime();
    const toTs = periodEnd.getTime();

    // 1) filter records for this subscription + time window
    const records = store
        .getRecords()
        .filter((r) => {
            const subId = (r as any).subscriptionId as string | undefined;
            if (subId !== subscriptionId) return false;

            const t =
                r.timestamp instanceof Date
                    ? r.timestamp.getTime()
                    : new Date(r.timestamp as any).getTime();

            return t >= fromTs && t <= toTs;
        });

    // 2) group by serviceId and accumulate
    const byService = new Map<string, { count: number; totalUsd: number }>();

    for (const r of records) {
        const serviceId = r.serviceId;
        const bucket = byService.get(serviceId) ?? { count: 0, totalUsd: 0 };
        bucket.count += 1;
        bucket.totalUsd += r.usdAmount;
        byService.set(serviceId, bucket);
    }

    const lines: InvoiceLine[] = Array.from(byService.entries()).map(
        ([serviceId, { count, totalUsd }]) => ({
            serviceId,
            count,
            totalUsd,
        })
    );

    const totalUsd = lines.reduce((sum, l) => sum + l.totalUsd, 0);

    return {
        subscriptionId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        generatedAt: new Date().toISOString(),
        currency: "USD",
        lines,
        totalUsd,
    };
}
