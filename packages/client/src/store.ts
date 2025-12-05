//see this in detail later on (see)


import { UsageContext, UsageRecord } from "./types";

export interface UsageStore {
    recordUsage(ctx: UsageContext): UsageRecord;
    getDailySpendUsd(args: { date: Date; serviceId?: string; agentId?: string }): number;
    getMonthlySpendUsd(args: { date: Date; serviceId?: string; agentId?: string }): number;
    getRecords(): UsageRecord[];
}

/**
 * Very simple in memory implementation.
 * In real apps people can plug their own store (Redis, Postgres, etc).
 */
export class InMemoryUsageStore implements UsageStore {
    private records: UsageRecord[] = [];
    reset() {
        this.records = [];
    }

    recordUsage(ctx: UsageContext): UsageRecord {
        const rec: UsageRecord = {
            ...ctx,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`
        };
        this.records.push(rec);
        return rec;
    }
    getRecords(): UsageRecord[] {
        // Return a shallow copy so callers cannot mutate internal array by accident
        return [...this.records];
    }

    private filterByWindow(
        from: Date,
        to: Date,
        filters: { serviceId?: string; agentId?: string }
    ) {
        return this.records.filter((r) => {
            if (r.timestamp < from || r.timestamp > to) return false;
            if (filters.serviceId && r.serviceId !== filters.serviceId) return false;
            if (filters.agentId && r.agentId !== filters.agentId) return false;
            return true;
        });
    }

    getDailySpendUsd(args: { date: Date; serviceId?: string; agentId?: string }): number {
        const start = new Date(args.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(args.date);
        end.setHours(23, 59, 59, 999);

        return this.filterByWindow(start, end, args).reduce(
            (sum, r) => sum + r.usdAmount,
            0
        );
    }

    getMonthlySpendUsd(args: { date: Date; serviceId?: string; agentId?: string }): number {
        const start = new Date(args.date);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);

        return this.filterByWindow(start, end, args).reduce(
            (sum, r) => sum + r.usdAmount,
            0
        );
    }
}
