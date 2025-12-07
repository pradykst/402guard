import type { UsageStore } from "./store";

export type InvoiceRow = {
    timestamp: Date;
    serviceId: string;
    agentId?: string;
    usdAmount: number;
};

/**
 * Generate a simple CSV invoice from the UsageStore.
 *
 * You can filter by agent and by time window [from, to].
 */
export function generateInvoiceCsv(opts: {
    store: UsageStore;
    agentId?: string;
    from?: Date;
    to?: Date;
}): string {
    const { store, agentId, from, to } = opts;

    const records = (store.getRecords() as any[]).filter((r) => {
        if (agentId && r.agentId !== agentId) return false;
        if (from && r.timestamp < from) return false;
        if (to && r.timestamp > to) return false;
        return true;
    });

    const header = "timestamp,serviceId,agentId,usdAmount\n";

    const rows = records
        .map((r) => {
            const ts =
                r.timestamp instanceof Date
                    ? r.timestamp.toISOString()
                    : new Date(r.timestamp).toISOString();

            const svc = r.serviceId ?? "";
            const agent = r.agentId ?? "";
            const usd = typeof r.usdAmount === "number" ? r.usdAmount : Number(r.usdAmount);

            return `${ts},${svc},${agent},${usd.toFixed(4)}`;
        })
        .join("\n");

    return header + rows;
}
