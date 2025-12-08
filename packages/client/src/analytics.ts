import { UsageStore } from "./store";
import { UsageRecord } from "./types";

export type ServiceSpendSummary = {
    serviceId: string;
    totalUsd: number;
    count: number;
};

export type AgentSpendSummary = {
    agentId: string;
    totalUsd: number;
    count: number;
};

export type SubscriptionSpendSummary = {
    subscriptionId: string;
    count: number;
    totalUsd: number;
};


export function getSubscriptionSpendSummary(
    store: UsageStore
): SubscriptionSpendSummary[] {
    // iterate over store.getAll(), group by subscriptionId, ignore undefined
    const acc = new Map<string, { count: number; totalUsd: number }>();

    for (const r of store.getRecords()) {
        // we only care about records that have a subscriptionId
        const subId = (r as any).subscriptionId as string | undefined;
        if (!subId) continue;

        const current = acc.get(subId) ?? { count: 0, totalUsd: 0 };
        current.count += 1;
        current.totalUsd += r.usdAmount;
        acc.set(subId, current);
    }

    return Array.from(acc.entries()).map(
        ([subscriptionId, { count, totalUsd }]) => ({
            subscriptionId,
            count,
            totalUsd,
        })
    );
}


/**
 * Aggregate total spend per service across all records.
 */
export function getServiceSpendSummary(store: UsageStore): ServiceSpendSummary[] {
    const records = store.getRecords();

    const map = new Map<string, { totalUsd: number; count: number }>();

    for (const r of records) {
        const key = r.serviceId;
        const prev = map.get(key) ?? { totalUsd: 0, count: 0 };
        prev.totalUsd += r.usdAmount;
        prev.count += 1;
        map.set(key, prev);
    }

    return Array.from(map.entries()).map(([serviceId, v]) => ({
        serviceId,
        totalUsd: v.totalUsd,
        count: v.count
    }));
}

/**
 * Aggregate total spend per agent across all records.
 */
export function getAgentSpendSummary(store: UsageStore): AgentSpendSummary[] {
    const records = store.getRecords().filter(r => r.agentId);

    const map = new Map<string, { totalUsd: number; count: number }>();

    for (const r of records) {
        const key = r.agentId as string;
        const prev = map.get(key) ?? { totalUsd: 0, count: 0 };
        prev.totalUsd += r.usdAmount;
        prev.count += 1;
        map.set(key, prev);
    }

    return Array.from(map.entries()).map(([agentId, v]) => ({
        agentId,
        totalUsd: v.totalUsd,
        count: v.count
    }));
}


