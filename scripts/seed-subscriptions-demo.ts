import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import {
  subscriptionsClient,
  createPlan,
  subscribeUser,
  isSubscriptionActive,
} from "@402guard/subscriptions";

async function main() {
  const rpc = process.env.AVALANCHE_FUJI_RPC;
  const contract = process.env.NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS;
  const pk = process.env.GUARD402_BILLING_PK as `0x${string}`;

  if (!rpc || !contract || !pk) {
    throw new Error(
      "Missing AVALANCHE_FUJI_RPC or NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS or GUARD402_BILLING_PK in .env"
    );
  }

  const account = privateKeyToAccount(pk);
  const demoWallet = account.address;

  const PLAN_ID = "demo-plan";

  console.log("🚀 402Guard seed script starting...");
  console.log("RPC:", rpc);
  console.log("Contract:", contract);
  console.log("Demo wallet:", demoWallet);
  console.log("");

  // --------------------------------------------------
  // 1) Create plan if it does not exist
  // --------------------------------------------------
  console.log(`📦 Creating plan "${PLAN_ID}" (or reusing if it exists)...`);

  try {
    const createHash = await createPlan({
      planId: PLAN_ID,
      // 0.03 USD in micros
      dailyUsdCapMicros: 30_000n,
      // 1 day billing window
      periodSeconds: 24n * 60n * 60n,
    });

    console.log("createPlan tx hash:", createHash);
    console.log("⏳ Waiting for createPlan to be mined...");

    await subscriptionsClient.waitForTransactionReceipt({
      hash: createHash,
    });

    console.log("✅ Plan created on chain\n");
  } catch (err: any) {
    const msg =
      String(err?.shortMessage || err?.cause?.reason || err?.message || err);

    if (msg.includes("plan exists")) {
      console.log("ℹ️ Plan already exists on chain, skipping createPlan.\n");
    } else {
      console.error("❌ Unexpected error while creating plan:");
      throw err;
    }
  }

  // --------------------------------------------------
  // 2) Subscribe demo wallet if not already subscribed
  // --------------------------------------------------
  const alreadyActive = await isSubscriptionActive({
    user: demoWallet,
    planId: PLAN_ID,
  });

  if (alreadyActive) {
    console.log(
      `ℹ️ Wallet ${demoWallet} is already subscribed to "${PLAN_ID}". Nothing to do.`
    );
    return;
  }

  console.log(`👤 Subscribing user ${demoWallet} to "${PLAN_ID}"...`);

  const nowSec = Math.floor(Date.now() / 1000);
  const expiry = BigInt(nowSec + 7 * 24 * 60 * 60); // 7 days from now

  const subHash = await subscribeUser({
    user: demoWallet,
    planId: PLAN_ID,
    expiry,
  });

  console.log("subscribe tx hash:", subHash);
  console.log("⏳ Waiting for subscribe to be mined...");

  await subscriptionsClient.waitForTransactionReceipt({
    hash: subHash,
  });

  console.log("✅ Subscription recorded\n");

  const finalActive = await isSubscriptionActive({
    user: demoWallet,
    planId: PLAN_ID,
  });

  console.log("🔍 isSubscriptionActive after subscribe:", finalActive);
  console.log("Done.");
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});
