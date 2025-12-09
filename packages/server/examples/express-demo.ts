import express from "express";
import { requireSubscription } from "../src";

const app = express();
const port = 4002;

// Hard coded plan key for the demo.
// In a real app, this could be "starter", "pro", etc.
const PLAN_ID = "demo-plan";

app.get(
    "/premium-data",
    requireSubscription({ planId: PLAN_ID }),
    (req, res) => {
        res.json({
            ok: true,
            data: "Secret premium data behind Guard402Subscriptions on Fuji"
        });
    }
);

// Health check without subscription
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(port, () => {
    console.log(`402Guard server demo listening at http://localhost:${port}`);
    console.log(
        `Try: curl "http://localhost:${port}/premium-data?wallet=0xyourFujiAddress"`
    );
});
