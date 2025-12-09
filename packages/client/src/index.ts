import {
    BudgetPolicy,
    ServicePolicy,
    PolicyConfig,
    UsageContext,
    EnforcementResult
} from "./types";
import { PayWithX402Args, PayWithX402Result } from "./x402-thirdweb";
import { InMemoryUsageStore, UsageStore } from "./store";
import { enforcePolicies } from "./policies";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import { extractServiceIdFromUrl } from "./url";
import {
    getServiceSpendSummary,
    getAgentSpendSummary,
    getSubscriptionSpendSummary,
    type ServiceSpendSummary,
    type AgentSpendSummary,
    type SubscriptionSpendSummary,
} from "./analytics";
import { generateInvoiceCsv } from "./invoice";



// Re-export types so library users can import them from "@402guard/client"
export type {
    BudgetPolicy,
    ServicePolicy,
    PolicyConfig,
    UsageContext,
    EnforcementResult,
    UsageStore,
    ServiceSpendSummary,
    AgentSpendSummary,
    SubscriptionSpendSummary,

};
export { InMemoryUsageStore, enforcePolicies, getServiceSpendSummary, getAgentSpendSummary, generateInvoiceCsv, getSubscriptionSpendSummary };
export type { InvoiceRow } from "./invoice";
export {
    pickFirstOption,
    estimateUsdFromQuote,
    payWithX402Local,
    payWithX402Avalanche,
} from "./x402";



export type GuardedClientOptions = {
    policies?: PolicyConfig;
    store?: UsageStore;

};

export type GuardedClient = {
    policies: PolicyConfig;
    store: UsageStore;

    // check + record (what you already had)
    checkAndRecord(ctx: UsageContext): EnforcementResult;

    // NEW: check only, no recording
    preview(ctx: UsageContext): EnforcementResult;
};

export type SubscriptionPlan = {
    id: string;
    name: string;
    monthlyUsdCap: number;
};

export type SubscriptionGuardOptions = {
    plan: SubscriptionPlan;
    basePolicies?: PolicyConfig;
    store?: UsageStore;
};

import type {
    X402Quote,
    X402AcceptOption,
    X402SettlementMeta,
} from "./types";
export type PayWithX402Fn = (args: {
    quote: X402Quote;
    option: X402AcceptOption;
    originalConfig: AxiosRequestConfig;
    axiosInstance: AxiosInstance;
}) => Promise<{ response: AxiosResponse<any>; settlement?: X402SettlementMeta }>;

export type EstimateUsdFromQuoteFn = (
    quote: X402Quote,
    option: X402AcceptOption
) => number;

export type SelectPaymentOptionFn = (quote: X402Quote) => X402AcceptOption;




export type GuardedAxiosOptions = GuardedClientOptions & {
    axiosInstance?: AxiosInstance;
    agentId?: string;
    subscriptionId?: string;

    // Existing simple estimator (still useful for non-x402 flows)
    estimateUsdForRequest?: (config: AxiosRequestConfig) => number;

    // NEW x402-specific hooks:
    facilitatorId?: string;              // label for analytics (e.g. "thirdweb")
    selectPaymentOption?: SelectPaymentOptionFn;
    estimateUsdFromQuote?: EstimateUsdFromQuoteFn;
    payWithX402?: (
        args: PayWithX402Args,
    ) => Promise<PayWithX402Result>;
};




export function createGuardedClient(
    options: GuardedClientOptions = {}
): GuardedClient {
    const policies: PolicyConfig = options.policies ?? {};
    const store: UsageStore = options.store ?? new InMemoryUsageStore();

    function checkAndRecord(ctx: UsageContext): EnforcementResult {
        const res = enforcePolicies(store, policies, ctx);
        if (res.allowed) {
            store.recordUsage(ctx);
        }
        return res;
    }

    function preview(ctx: UsageContext): EnforcementResult {
        // same policy check, but DO NOT record usage
        return enforcePolicies(store, policies, ctx);
    }

    return {
        policies,
        store,
        checkAndRecord,
        preview
    };
}
/**
 * Wrap an Axios instance with 402Guard policies.
 *
 * Two modes:
 *  - Simple mode (no x402 hooks): budgets are checked before each request
 *    using `estimateUsdForRequest`, and allowed calls are recorded immediately.
 *
 *  - x402 mode (pay-per-use APIs): you provide `selectPaymentOption`,
 *    `estimateUsdFromQuote`, and `payWithX402`. The client first receives an
 *    HTTP 402 with a quote, previews the spend against budgets, and, if allowed,
 *    calls your `payWithX402` function to perform the payment and retry.
 *    Only successful payments are recorded, with optional x402 metadata.
 */




export function createGuardedAxios(options: GuardedAxiosOptions = {}) {
    const { agentId } = options;

    const core = createGuardedClient(options);

    const axiosInstance =
        options.axiosInstance ??
        axios.create({});

    async function guardedRequest<T = any, R = AxiosResponse<T>>(
        config: AxiosRequestConfig
    ): Promise<R> {
        // 1) Build URL → serviceId
        const url = config.baseURL
            ? new URL(config.url ?? "", config.baseURL).toString()
            : (config.url ?? "");

        const serviceId = extractServiceIdFromUrl(url);

        // --- PATH A: x402 enabled? then first get the quote ---

        const hasX402 =
            !!options.payWithX402 &&
            !!options.selectPaymentOption &&
            !!options.estimateUsdFromQuote;

        if (hasX402) {
            // IMPORTANT: treat ALL HTTP statuses as "ok" so 402 is a normal response.
            let initialResponse: AxiosResponse<T>;
            try {
                initialResponse = await axiosInstance.request<T, AxiosResponse<T>>({
                    ...config,
                    validateStatus: () => true,
                });
            } catch (err: any) {
                // network / DNS / CORS etc
                throw err;
            }

            // if it’s not actually a 402, just return it like a normal request
            if (initialResponse.status !== 402) {
                return initialResponse as R;
            }

            // 402 → parse quote
            const quote = initialResponse.data as X402Quote;
            const option = options.selectPaymentOption!(quote);

            // derive usdAmount from the quote
            const usdAmount = options.estimateUsdFromQuote!(quote, option);
            const now = new Date();

            // preview budget BEFORE paying
            const previewRes = core.preview({
                serviceId,
                agentId,
                subscriptionId: options.subscriptionId,
                usdAmount,
                timestamp: now,
                x402: {
                    facilitatorId: options.facilitatorId,
                    network: option.network,
                    asset: option.asset,
                },
            });

            if (!previewRes.allowed) {
                const error = new Error(
                    `402Guard blocked x402 payment to ${serviceId}: ${previewRes.reason}`
                );
                // @ts-expect-error attach meta
                error.guard402 = {
                    serviceId,
                    agentId,
                    subscriptionId: options.subscriptionId,
                    usdAmount,
                    reason: previewRes.reason,
                    phase: "quote",
                };
                throw error;
            }

            // pay + retry with X-PAYMENT header
            const { response: finalResponse, settlement } =
                await options.payWithX402!({
                    quote,
                    option,
                    originalConfig: config,
                    axiosInstance,
                });

            // record usage AFTER successful payment
            core.checkAndRecord({
                serviceId,
                agentId,
                subscriptionId: options.subscriptionId,
                usdAmount,
                timestamp: new Date(),
                x402: {
                    facilitatorId: options.facilitatorId,
                    network: settlement?.network ?? option.network,
                    asset: option.asset,
                    transaction: settlement?.transaction ?? null,
                },
            });

            return finalResponse as R;
        }

        // --- PATH B: normal non-x402 call (your 200 demo, subscriptions demo, etc) ---

        const usdAmount =
            options.estimateUsdForRequest?.(config) ?? 0;

        const ctx = {
            serviceId,
            agentId,
            subscriptionId: options.subscriptionId,
            usdAmount,
            timestamp: new Date(),
        };

        const res = core.checkAndRecord(ctx);

        if (!res.allowed) {
            const error = new Error(
                `402Guard blocked request to ${serviceId}: ${res.reason}`
            );
            // @ts-expect-error
            error.guard402 = { serviceId, ctx, res };
            throw error;
        }

        // now do the actual HTTP request (any 4xx/5xx will be Axios errors)
        return axiosInstance.request<T, R>(config);
    }

    return Object.assign(axiosInstance, {
        guardedRequest,
        guard: core,
    });
}

