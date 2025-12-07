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
    type ServiceSpendSummary,
    type AgentSpendSummary
} from "./analytics";


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

};
export { InMemoryUsageStore, enforcePolicies, getServiceSpendSummary, getAgentSpendSummary };

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

    // Existing simple estimator (still useful for non-x402 flows)
    estimateUsdForRequest?: (config: AxiosRequestConfig) => number;

    // NEW x402-specific hooks:
    facilitatorId?: string;              // label for analytics (e.g. "thirdweb")
    selectPaymentOption?: SelectPaymentOptionFn;
    estimateUsdFromQuote?: EstimateUsdFromQuoteFn;
    payWithX402?: PayWithX402Fn;
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
    const { agentId, estimateUsdForRequest } = options;

    const core = createGuardedClient(options);

    const axiosInstance =
        options.axiosInstance ??
        axios.create({
            validateStatus: () => true,
        });

    const hasX402Hooks =
        Boolean(
            options.payWithX402 &&
            options.selectPaymentOption &&
            options.estimateUsdFromQuote
        );

    async function guardedRequest<T = any, R = AxiosResponse<T>>(
        config: AxiosRequestConfig
    ): Promise<R> {
        const url = config.baseURL
            ? new URL(config.url ?? "", config.baseURL).toString()
            : (config.url ?? "");

        const serviceId = extractServiceIdFromUrl(url);

        // -------------------------
        // Path A: simple budgeted HTTP call (no x402 hooks configured)
        // -------------------------
        if (!hasX402Hooks) {
            const usdAmount = estimateUsdForRequest?.(config) ?? 0;

            const ctx: UsageContext = {
                serviceId,
                agentId,
                usdAmount,
                timestamp: new Date(),
            };

            const res = core.checkAndRecord(ctx);

            if (!res.allowed) {
                const error = new Error(
                    `402Guard blocked request to ${serviceId}: ${res.reason}`
                );
                // @ts-expect-error attach metadata for app code
                error.guard402 = {
                    serviceId,
                    agentId,
                    usdAmount,
                    reason: res.reason,
                    phase: "pre",
                };
                throw error;
            }

            return axiosInstance.request<T, R>(config);
        }

        // -------------------------
        // Path B: x402-enabled flow (quote → preview → pay → record)
        // -------------------------

        // 1) First attempt: request that may return 402 with a quote
        let initialResponse: AxiosResponse<T>;
        try {
            initialResponse = await axiosInstance.request<T>(config);
        } catch (err: any) {
            throw err;
        }

        // If we didn't get a 402, there is nothing special to do.
        // Optionally, if we have estimateUsdForRequest, we can still record spend.
        if (
            initialResponse.status !== 402 ||
            !options.payWithX402 ||
            !options.selectPaymentOption ||
            !options.estimateUsdFromQuote
        ) {
            const usdAmount = estimateUsdForRequest?.(config);
            if (usdAmount != null) {
                core.checkAndRecord({
                    serviceId,
                    agentId,
                    usdAmount,
                    timestamp: new Date(),
                });
            }
            return initialResponse as R;
        }

        // 2) We have a 402 quote → parse it
        const quote = initialResponse.data as X402Quote;
        const option = options.selectPaymentOption(quote);

        // 3) Use the quote to estimate USD price
        const usdAmount = options.estimateUsdFromQuote(quote, option);

        const now = new Date();

        // 4) Preview policy BEFORE paying
        const previewRes = core.preview({
            serviceId,
            agentId,
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
            // @ts-expect-error
            error.guard402 = {
                serviceId,
                agentId,
                usdAmount,
                reason: previewRes.reason,
                phase: "quote",
            };
            throw error;
        }

        // 5) Ask facilitator to pay & retry with X-PAYMENT
        const { response: finalResponse, settlement } = await options.payWithX402({
            quote,
            option,
            originalConfig: config,
            axiosInstance,
        });

        // 6) Record usage AFTER successful payment
        core.checkAndRecord({
            serviceId,
            agentId,
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

    return Object.assign(axiosInstance, {
        guardedRequest,
        guard: core,
    });
}



