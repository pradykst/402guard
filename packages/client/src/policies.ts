import { BudgetPolicy, PolicyConfig, UsageContext, EnforcementResult } from "./types";
import type { UsageStore } from "./store";

function applyBudgetPolicy(
    store: UsageStore,
    policy: BudgetPolicy,
    ctx: UsageContext
): EnforcementResult {
    const now = ctx.timestamp;

    if (policy.dailyUsdCap != null) {
        const spentToday = store.getDailySpendUsd({
            date: now,
            serviceId: ctx.serviceId,
            agentId: ctx.agentId
        });
        if (spentToday + ctx.usdAmount > policy.dailyUsdCap) {
            return {
                allowed: false,
                reason: `Daily cap exceeded for service ${ctx.serviceId}`
            };
        }
    }

    if (policy.monthlyUsdCap != null) {
        const spentThisMonth = store.getMonthlySpendUsd({
            date: now,
            serviceId: ctx.serviceId,
            agentId: ctx.agentId
        });
        if (spentThisMonth + ctx.usdAmount > policy.monthlyUsdCap) {
            return {
                allowed: false,
                reason: `Monthly cap exceeded for service ${ctx.serviceId}`
            };
        }
    }

    return { allowed: true };
}

export function enforcePolicies(
    store: UsageStore,
    policies: PolicyConfig,
    ctx: UsageContext
): EnforcementResult {
    // Service specific
    const servicePolicy = policies.services?.[ctx.serviceId];
    if (servicePolicy) {
        const res = applyBudgetPolicy(store, servicePolicy, ctx);
        if (!res.allowed) return res;
    }

    // Agent specific
    if (ctx.agentId) {
        const agentPolicy = policies.agents?.[ctx.agentId];
        if (agentPolicy) {
            const res = applyBudgetPolicy(store, agentPolicy, ctx);
            if (!res.allowed) return res;
        }
    }

    // Global fallback
    if (policies.global) {
        return applyBudgetPolicy(store, policies.global, ctx);
    }

    return { allowed: true };
}
