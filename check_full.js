
function findExport(obj, name, path = "") {
    if (!obj || typeof obj !== "object") return;

    if (path.split(".").length > 3) return; // limit depth

    for (const key of Object.keys(obj)) {
        if (key === name) {
            console.log(`FOUND: ${path}.${key}`);
        }
        // recursing into objects is risky if circular, but let's try shallow
        // actually most exports are flat on the module or one level deep
    }
}

try {
    const thirdweb = require("thirdweb");
    console.log("Checking root exports...");
    findExport(thirdweb, "pay", "thirdweb");
    findExport(thirdweb, "payRequest", "thirdweb");
    findExport(thirdweb, "x402", "thirdweb");

    if (thirdweb.x402) {
        console.log("Checking thirdweb.x402...");
        console.log(Object.keys(thirdweb.x402));
    }
} catch (e) { console.log("Error loading thirdweb:", e.message); }
