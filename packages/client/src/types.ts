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

/**
 * Context about the current call that we might use for policy checks.
 */
export type UsageContext = {
    serviceId: string;       // e.g. "api.tokenmetrics.com"
    agentId?: string;        // e.g. "donor-dashboard"
    usdAmount: number;       // how much this call is expected to cost
    timestamp: Date;         // when this call is happening
};

export type UsageRecord = UsageContext & {
    id: string;              // unique id per call or per payment
};

export type EnforcementResult =
    | { allowed: true }
    | {
        allowed: false;
        reason: string;
    };
