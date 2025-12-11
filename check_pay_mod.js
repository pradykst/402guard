
try {
    const mod = require("thirdweb/pay");
    console.log("Exports of thirdweb/pay:", Object.keys(mod));
} catch (e) { console.log("Error:", e.message); }
