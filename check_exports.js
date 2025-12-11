
try {
    const x402 = require("thirdweb/x402");
    console.log("Exports of thirdweb/x402:", Object.keys(x402));
} catch (e) {
    console.error("Could not require thirdweb/x402:", e.message);
}
