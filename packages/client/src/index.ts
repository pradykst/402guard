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
    AgentSpendSummary
};
export { InMemoryUsageStore, enforcePolicies, getServiceSpendSummary, getAgentSpendSummary };

export type GuardedClientOptions = {
    policies?: PolicyConfig;
    store?: UsageStore;
};

export type GuardedAxiosOptions = GuardedClientOptions & {
    /**
     * Optional existing axios instance to wrap.
     * If not provided, we will create a new one.
     */
    axiosInstance?: AxiosInstance;
    /**
     * Optional identifier for the agent using this client.
     */
    agentId?: string;
    /**
     * Function that estimates USD cost for a given request.
     * For now this is a simple hook that the app can provide.
     * Later we will connect it to x402 invoices.
     */
    estimateUsdForRequest?: (config: AxiosRequestConfig) => number;
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

export function createGuardedAxios(options: GuardedAxiosOptions = {}) {
    const { agentId, estimateUsdForRequest } = options;

    const core = createGuardedClient(options);

    const axiosInstance =
        options.axiosInstance ??
        axios.create({
            // you can set some safe defaults here if needed
        });

    async function guardedRequest<T = any, R = AxiosResponse<T>>(
        config: AxiosRequestConfig
    ): Promise<R> {
        const url = config.baseURL
            ? new URL(config.url ?? "", config.baseURL).toString()
            : (config.url ?? "");

        const serviceId = extractServiceIdFromUrl(url);

        const usdAmount =
            estimateUsdForRequest?.(config) ??
            0; // until we plug in real x402, assume 0 or require user to pass a function

        const ctx = {
            serviceId,
            agentId,
            usdAmount,
            timestamp: new Date()
        };

        const res = core.checkAndRecord(ctx);

        if (!res.allowed) {
            const error = new Error(
                `402Guard blocked request to ${serviceId}: ${res.reason}`
            );
            // @ts-expect-error attach metadata for app code to inspect
            error.guard402 = { serviceId, ctx, res };
            throw error;
        }

        // If allowed, perform the actual HTTP request
        return axiosInstance.request<T, R>(config);
    }

    return Object.assign(axiosInstance, {
        guardedRequest,
        guard: core
    });
}

