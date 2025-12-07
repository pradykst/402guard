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


export type X402AcceptOption = {
    scheme: string;              // e.g. "exact"
    network: string;             // e.g. "avalanche-fuji"
    maxAmountRequired: string;   // payment amount in smallest units (string)
    payTo: string;               // merchant address
    asset: string;               // ERC20 address (e.g. USDC)
    resource?: string;           // optional resource identifier
};

// The JSON body of an HTTP 402 payment quote
export type X402Quote = {
    x402Version: number;
    accepts: X402AcceptOption[];
    error?: string;
};

export type X402SettlementMeta = {
    success: boolean;
    transaction?: string;
    network?: string;
    payer?: string;
    errorReason?: string | null;
};

// Minimal meta that we keep alongside a UsageRecord
export type X402Meta = {
    facilitatorId?: string;         // e.g. "thirdweb", "youmio"
    network?: string;               // chain id / name
    asset?: string;                 // ERC20 address
    transaction?: string | null;    // tx hash if known
};

export type UsageContext = {
    serviceId: string;       // e.g. "api.tokenmetrics.com"
    agentId?: string;        // e.g. "donor-dashboard"
    usdAmount: number;       // how much this call is expected to cost
    timestamp: Date;         // when this call is happening
    x402?: X402Meta;
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

