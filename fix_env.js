const fs = require('fs');
const path = require('path');

const rootEnvPath = path.resolve('.env');
const webEnvPath = path.resolve('apps/web/.env.local');

console.log(`Reading from ${rootEnvPath}`);
console.log(`Target ${webEnvPath}`);

let rootEnv = '';
try {
    rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
} catch (e) {
    console.log('Cannot read .env: ' + e.message);
    process.exit(1);
}

let webEnv = '';
try {
    webEnv = fs.readFileSync(webEnvPath, 'utf8');
} catch (e) {
    console.log('Cannot read web env, creating new if needed');
}

const vars = {};
rootEnv.split('\n').forEach(line => {
    // simpler parsing
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
        const k = line.substring(0, eqIdx).trim();
        const v = line.substring(eqIdx + 1).trim();
        vars[k] = v;
    }
});

const webVars = {};
webEnv.split('\n').forEach(line => {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
        const k = line.substring(0, eqIdx).trim();
        const v = line.substring(eqIdx + 1).trim();
        webVars[k] = v;
    }
});

let append = '\n# Added by fix script\n';

// 1. NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS
if (!webVars['NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS'] && vars['NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS']) {
    console.log('Adding NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS');
    append += `NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS=${vars['NEXT_PUBLIC_GUARD402_SUBSCRIPTIONS']}\n`;
}

// 2. Client ID alias
// If THIRDWEB_CLIENT_ID exists in web env but NEXT_PUBLIC_... does not, assume we need to expose it.
if (webVars['THIRDWEB_CLIENT_ID'] && !webVars['NEXT_PUBLIC_THIRDWEB_CLIENT_ID']) {
    console.log('Aliasing THIRDWEB_CLIENT_ID to NEXT_PUBLIC_THIRDWEB_CLIENT_ID');
    append += `NEXT_PUBLIC_THIRDWEB_CLIENT_ID=${webVars['THIRDWEB_CLIENT_ID']}\n`;
} else if (!webVars['NEXT_PUBLIC_THIRDWEB_CLIENT_ID'] && vars['THIRDWEB_CLIENT_ID']) {
    // Or if in root
    console.log('Copying THIRDWEB_CLIENT_ID from root to NEXT_PUBLIC_...');
    append += `NEXT_PUBLIC_THIRDWEB_CLIENT_ID=${vars['THIRDWEB_CLIENT_ID']}\n`;
}

if (append.trim() === '# Added by fix script') {
    console.log('Nothing to add.');
} else {
    fs.appendFileSync(webEnvPath, append);
    console.log('Appended vars to web/.env.local');
}
