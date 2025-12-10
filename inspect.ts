const fs = require('fs');

async function run() {
    let output = "";

    try {
        const x402 = await import("thirdweb/x402");
        output += "x402: " + JSON.stringify(Object.keys(x402)) + "\n";
    } catch (e: any) {
        output += "x402 error: " + e.message + "\n";
    }

    try {
        const pay = await import("thirdweb/pay");
        output += "pay: " + JSON.stringify(Object.keys(pay)) + "\n";
    } catch (e: any) {
        output += "pay error: " + e.message + "\n";
    }

    try {
        const root = await import("thirdweb");
        output += "root: " + JSON.stringify(Object.keys(root).filter(k => k.toLowerCase().includes('pay') || k.toLowerCase().includes('settle'))) + "\n";
    } catch (e: any) {
        output += "root error: " + e.message + "\n";
    }

    fs.writeFileSync("inspect_output.txt", output);
    console.log("Done");
}

run();
