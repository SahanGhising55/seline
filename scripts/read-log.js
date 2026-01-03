const fs = require('fs');
const path = require('path');

const logPath = path.join(process.cwd(), 'build-error.log');
if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf16le');
    console.log(content);
} else {
    console.log('Log file not found');
}
