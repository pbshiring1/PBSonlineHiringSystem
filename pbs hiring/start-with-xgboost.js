const { spawn } = require('child_process');
const path = require('path');

console.log('Starting PBS Hiring System with XGBoost Integration...');

// Start the XGBoost API server
console.log('Starting XGBoost API server on port 3001...');
const apiServer = spawn('node', [path.join(__dirname, 'src', 'utils', 'xgboost_server.js')], {
    stdio: 'inherit',
    shell: true
});

// Wait a moment for the API server to start
setTimeout(() => {
    console.log('Starting React development server...');
    const reactApp = spawn('npm', ['start'], {
        stdio: 'inherit',
        shell: true
    });

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\nShutting down servers...');
        apiServer.kill();
        reactApp.kill();
        process.exit(0);
    });

    reactApp.on('close', (code) => {
        console.log(`React app exited with code ${code}`);
        apiServer.kill();
        process.exit(code);
    });

    apiServer.on('close', (code) => {
        console.log(`API server exited with code ${code}`);
        reactApp.kill();
        process.exit(code);
    });
}, 2000);