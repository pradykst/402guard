
try {
    const x402 = require("thirdweb/x402");
    if (x402.pay) {
        console.log("Success: 'pay' is exported from thirdweb/x402");
    } else {
        console.log("Error: 'pay' is NOT exported. Available:", Object.keys(x402));
    }
} catch (e) {
    console.error("Could not require thirdweb/x402:", e.message);
}
