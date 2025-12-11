const fs = require('fs');
try {
    console.log('---WEB LOCAL---');
    console.log(fs.readFileSync('apps/web/.env.local', 'utf8'));
} catch (e) { console.log('Error reading web local: ' + e.message); }
try {
    console.log('---ROOT ENV---');
    console.log(fs.readFileSync('.env', 'utf8'));
} catch (e) { console.log('Error reading root env: ' + e.message); }
