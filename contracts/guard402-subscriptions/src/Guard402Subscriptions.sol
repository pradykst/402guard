// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title Guard402Subscriptions
/// @notice Minimal on-chain registry of subscription plans and active subscribers.
///         Off-chain 402Guard SDK uses this as a source of truth for "is this subscription active?"
contract Guard402Subscriptions is Ownable {
    struct Plan {
        uint256 dailyUsdCapMicros; // e.g. $0.03 => 30_000
        uint256 periodSeconds;     // billing period, e.g. 86400
        bool active;
    }

    // Plan id is a bytes32 hash so the TS SDK can use string ids and hash them.
    mapping(bytes32 => Plan) public plans;

    // subscriber => planId => expiry timestamp (unix seconds)
    mapping(address => mapping(bytes32 => uint256)) public subscriptions;

    event PlanCreated(bytes32 indexed planId, uint256 dailyUsdCapMicros, uint256 periodSeconds);
    event PlanUpdated(bytes32 indexed planId, uint256 dailyUsdCapMicros, uint256 periodSeconds, bool active);

    event Subscribed(address indexed user, bytes32 indexed planId, uint256 expiry);
    event SubscriptionExtended(address indexed user, bytes32 indexed planId, uint256 oldExpiry, uint256 newExpiry);

    event UsageRecorded(address indexed user, bytes32 indexed planId, uint256 usdAmountMicros);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ------------ Plan management ------------

    function createPlan(
        bytes32 planId,
        uint256 dailyUsdCapMicros,
        uint256 periodSeconds
    ) external onlyOwner {
        require(!plans[planId].active, "plan exists");

        plans[planId] = Plan({
            dailyUsdCapMicros: dailyUsdCapMicros,
            periodSeconds: periodSeconds,
            active: true
        });

        emit PlanCreated(planId, dailyUsdCapMicros, periodSeconds);
    }

    function updatePlan(
        bytes32 planId,
        uint256 dailyUsdCapMicros,
        uint256 periodSeconds,
        bool active
    ) external onlyOwner {
        Plan storage p = plans[planId];
        require(p.periodSeconds != 0, "plan missing");

        p.dailyUsdCapMicros = dailyUsdCapMicros;
        p.periodSeconds = periodSeconds;
        p.active = active;

        emit PlanUpdated(planId, dailyUsdCapMicros, periodSeconds, active);
    }

    // ------------ Subscriptions ------------

    function subscribe(address user, bytes32 planId, uint256 expiry) external onlyOwner {
        require(plans[planId].active, "plan inactive");
        require(expiry > block.timestamp, "expiry in past");

        subscriptions[user][planId] = expiry;
        emit Subscribed(user, planId, expiry);
    }

    function extendSubscription(address user, bytes32 planId, uint256 extraSeconds) external onlyOwner {
        uint256 oldExpiry = subscriptions[user][planId];
        require(oldExpiry != 0, "not subscribed");

        uint256 newExpiry = oldExpiry + extraSeconds;
        subscriptions[user][planId] = newExpiry;
        emit SubscriptionExtended(user, planId, oldExpiry, newExpiry);
    }

    function isActive(address user, bytes32 planId) external view returns (bool) {
        Plan memory p = plans[planId];
        if (!p.active) return false;
        uint256 expiry = subscriptions[user][planId];
        return expiry >= block.timestamp;
    }

    /// @notice Optional hook so the SDK can emit on-chain audit logs for usage per subscription.
    function recordUsage(
        address user,
        bytes32 planId,
        uint256 usdAmountMicros
    ) external onlyOwner {
        emit UsageRecorded(user, planId, usdAmountMicros);
    }
}
