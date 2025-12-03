// Basic policy types for budgets and rate limits

export type BudgetPolicy = {
    dailyUsdCap?: number;
    monthlyUsdCap?: number;
};

export type ServicePolicy = BudgetPolicy & {
    requestsPerMinute?: number;
};

export type PolicyConfig = {
    global?: BudgetPolicy;
    services?: Record<string, ServicePolicy>;
    agents?: Record<string, BudgetPolicy>;
};

export type GuardedClientOptions = {
    policies?: PolicyConfig;
};

/**
 * Very early stub.
 * Later we will wrap a real x402-aware HTTP client.
 */
export function createGuardedClient(options: GuardedClientOptions = {}) {
    const policies = options.policies ?? {};

    function hello() {
        const serviceCount = Object.keys(policies.services ?? {}).length;
        return `402Guard client ready with ${serviceCount} service polic${serviceCount === 1 ? "y" : "ies"}.`;
    }

    return {
        options: { policies },
        hello,
    };
}
