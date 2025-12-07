import {
    BudgetPolicy,
    ServicePolicy,
    PolicyConfig,
    UsageContext,
    EnforcementResult
} from "./types";
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
    payWithX402?: PayWithX402Fn;
};

export function createSubscriptionAxios(options: SubscriptionGuardOptions) {
    // internally calls createGuardedAxios with:
    // - a policy that sets global.dailyUsdCap = plan.monthlyUsdCap (or a fraction for demo)
    // - a store (shared with the rest of the app)
    // - and automatically injects subscriptionId into UsageContext via a thin wrapper
}




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
    const { agentId, subscriptionId, estimateUsdForRequest } = options;
    const core = createGuardedClient(options);

    const axiosInstance =
        options.axiosInstance ??
        axios.create({});

    // do we have x402 hooks wired?
    const hasX402 =
        !!options.payWithX402 &&
        !!options.selectPaymentOption &&
        !!options.estimateUsdFromQuote;

    async function guardedRequest<T = any, R = AxiosResponse<T>>(
        config: AxiosRequestConfig
    ): Promise<R> {
        // 1) Build URL and serviceId
        const url = config.baseURL
            ? new URL(config.url ?? "", config.baseURL).toString()
            : (config.url ?? "");

        const serviceId = extractServiceIdFromUrl(url);

        // ---------- SIMPLE (non-x402) PATH ----------
        if (!hasX402) {
            const usdAmount =
                estimateUsdForRequest?.(config) ?? 0;

            const ctx: UsageContext = {
                serviceId,
                agentId,
                subscriptionId,          // 🔹 tag subscription
                usdAmount,
                timestamp: new Date(),
            };

            const res = core.checkAndRecord(ctx);

            if (!res.allowed) {
                const error = new Error(
                    `402Guard blocked request to ${serviceId}: ${res.reason}`
                );
                // @ts-expect-error attach meta
                error.guard402 = { serviceId, ctx, res };
                throw error;
            }

            return axiosInstance.request<T, R>(config);
        }

        // ---------- x402 PATH ----------

        // First request: get quote (402) or maybe 200
        let initialResponse: AxiosResponse<T>;
        try {
            initialResponse = await axiosInstance.request<T>(config);
        } catch (err: any) {
            throw err;
        }

        // If it wasn't 402, nothing to pay; just return the response.
        if (initialResponse.status !== 402) {
            return initialResponse as R;
        }

        // 4) Parse 402 quote body
        const quote = initialResponse.data as X402Quote;
        const option = options.selectPaymentOption!(quote);

        // 5) Estimate USD cost from quote
        const usdAmount = options.estimateUsdFromQuote!(quote, option);
        const now = new Date();

        // 6) Preview budget BEFORE paying
        const previewCtx: UsageContext = {
            serviceId,
            agentId,
            subscriptionId,          // 🔹 tag subscription here too
            usdAmount,
            timestamp: now,
            x402: {
                facilitatorId: options.facilitatorId,
                network: option.network,
                asset: option.asset,
            },
        };

        const previewRes = core.preview(previewCtx);

        if (!previewRes.allowed) {
            const error = new Error(
                `402Guard blocked x402 payment to ${serviceId}: ${previewRes.reason}`
            );
            // @ts-expect-error attach meta
            error.guard402 = {
                serviceId,
                agentId,
                subscriptionId,
                usdAmount,
                reason: previewRes.reason,
                phase: "quote",
            };
            throw error;
        }

        // 7) Ask facilitator to pay & retry the request with X-PAYMENT
        const { response: finalResponse, settlement } =
            await options.payWithX402!({
                quote,
                option,
                originalConfig: config,
                axiosInstance,
            });

        // 8) Record usage AFTER successful payment
        const recordCtx: UsageContext = {
            serviceId,
            agentId,
            subscriptionId,          // 🔹 and here
            usdAmount,
            timestamp: new Date(),
            x402: {
                facilitatorId: options.facilitatorId,
                network: settlement?.network ?? option.network,
                asset: option.asset,
                transaction: settlement?.transaction ?? null,
            },
        };

        core.checkAndRecord(recordCtx);

        return finalResponse as R;
    }

    return Object.assign(axiosInstance, {
        guardedRequest,
        guard: core,
    });
}




