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

export function createGuardedAxios(options: GuardedAxiosOptions = {}) {
    const { agentId, estimateUsdForRequest } = options;

    const core = createGuardedClient(options);

    const axiosInstance =
        options.axiosInstance ??
        axios.create({});

    async function guardedRequest<T = any, R = AxiosResponse<T>>(
        config: AxiosRequestConfig
    ): Promise<R> {
        // 1) Build URL and serviceId
        const url = config.baseURL
            ? new URL(config.url ?? "", config.baseURL).toString()
            : (config.url ?? "");

        const serviceId = extractServiceIdFromUrl(url);

        // 2) First attempt: plain HTTP request
        let initialResponse: AxiosResponse<T>;
        try {
            initialResponse = await axiosInstance.request<T>(config);
        } catch (err: any) {
            // Network / non-HTTP errors surface directly
            throw err;
        }

        // 3) If not 402 OR no x402 hooks configured, just return
        if (
            initialResponse.status !== 402 ||
            !options.payWithX402 ||
            !options.selectPaymentOption ||
            !options.estimateUsdFromQuote
        ) {
            return initialResponse as R;
        }

        // 4) Parse 402 quote body
        const quote = initialResponse.data as X402Quote;
        const option = options.selectPaymentOption(quote);

        // 5) Estimate USD cost from quote
        const usdAmount = options.estimateUsdFromQuote(quote, option);

        const now = new Date();

        // 6) Preview budget BEFORE paying
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
            // Attach meta for caller
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

        // 7) Ask facilitator to pay & retry the request with X-PAYMENT
        const { response: finalResponse, settlement } =
            await options.payWithX402({
                quote,
                option,
                originalConfig: config,
                axiosInstance,
            });

        // 8) Record usage AFTER successful payment
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


