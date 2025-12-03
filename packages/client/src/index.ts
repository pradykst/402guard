import {
    BudgetPolicy,
    ServicePolicy,
    PolicyConfig,
    UsageContext,
    EnforcementResult
} from "./types";
import { InMemoryUsageStore, UsageStore } from "./store";
import { enforcePolicies } from "./policies";

// Re-export types so library users can import them from "@402guard/client"
export type {
    BudgetPolicy,
    ServicePolicy,
    PolicyConfig,
    UsageContext,
    EnforcementResult,
    UsageStore
};
export { InMemoryUsageStore, enforcePolicies };

export type GuardedClientOptions = {
    policies?: PolicyConfig;
    store?: UsageStore;
};

export function createGuardedClient(options: GuardedClientOptions = {}) {
    const policies: PolicyConfig = options.policies ?? {};
    const store: UsageStore = options.store ?? new InMemoryUsageStore();

    function checkAndRecord(ctx: UsageContext): EnforcementResult {
        const res = enforcePolicies(store, policies, ctx);
        if (res.allowed) {
            store.recordUsage(ctx);
        }
        return res;
    }

    return {
        policies,
        store,
        checkAndRecord
    };
}
