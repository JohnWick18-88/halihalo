/**
 * God's Eye Sachsen — Lokaler Entwicklungsserver + CORS-Proxy
 *
 * Starten: node server.js
 * Dann: http://localhost:8080
 *
 * Warum nötig?
 * Browser blockieren fetch() zu fremden Domains (CORS).
 * Dieser Server leitet LUIS- und RAPIS-Anfragen serverseitig weiter
 * und fügt die nötigen CORS-Header hinzu.
 *
 * Keine npm-Pakete nötig — nur Node.js (ab v16).
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT = 8080;

// ---- MIME-Typen ----
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.geojson': 'application/geo+json; charset=utf-8'
};

// ---- Proxy-Routen ----
// /api/luis/*  → https://luis.sachsen.de/arcgis/rest/services/*
// /api/rapis/* → https://rfrp.rapis-ipm-gis.de/rapis/*
const PROXY_ROUTES = [
    {
        prefix: '/api/luis/',
        target: 'luis.sachsen.de',
        targetPath: '/arcgis/rest/services/',
        protocol: 'https:'
    },
    {
        prefix: '/api/rapis/',
        target: 'rfrp.rapis-ipm-gis.de',
        targetPath: '/rapis/',
        protocol: 'https:'
    }
];

// ---- CORS-Header ----
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}

// ---- Proxy-Anfrage weiterleiten ----
function proxyRequest(req, res, route, reqUrl) {
    const parsedUrl = url.parse(reqUrl);
    const subPath   = parsedUrl.pathname.slice(route.prefix.length); // ohne /api/xxx prefix
    const targetPath = route.targetPath + subPath + (parsedUrl.search || '');

    const options = {
        hostname: route.target,
        path:     targetPath,
        method:   'GET',
        headers:  {
            'User-Agent': 'GodsEyeSachsen/1.0 (GIS Akquise-Tool)',
            'Accept':     req.headers['accept'] || '*/*'
        }
    };

    console.log(`[Proxy] ${route.prefix} → https://${route.target}${targetPath}`);

    const proxyReq = https.request(options, (proxyRes) => {
        setCors(res);
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream'
        });
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error(`[Proxy] Fehler: ${err.message}`);
        setCors(res);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Proxy-Fehler',
            message: err.message,
            hint: 'Sind Sie mit dem Firmennetzwerk / VPN verbunden?'
        }));
    });

    proxyReq.setTimeout(15000, () => {
        proxyReq.destroy();
        setCors(res);
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway Timeout', message: 'Server antwortet nicht (15s)' }));
    });

    proxyReq.end();
}

// ---- Statische Datei servieren ----
function serveStatic(req, res, filePath) {
    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            // Versuche index.html (SPA-Fallback)
            const fallback = path.join(__dirname, 'index.html');
            fs.readFile(fallback, (err2, data) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('404 Not Found');
                }
                setCors(res);
                res.writeHead(200, { 'Content-Type': MIME['.html'] });
                res.end(data);
            });
            return;
        }

        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';

        res.setHeader('Cache-Control', 'no-cache');
        setCors(res);

        const stream = fs.createReadStream(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        stream.pipe(res);

        stream.on('error', () => {
            res.end();
        });
    });
}

// ---- Haupt-Request-Handler ----
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname  = parsedUrl.pathname;

    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
        setCors(res);
        res.writeHead(204);
        return res.end();
    }

    // Proxy-Route prüfen
    for (const route of PROXY_ROUTES) {
        if (pathname.startsWith(route.prefix)) {
            return proxyRequest(req, res, route, req.url);
        }
    }

    // Statische Dateien
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Pfad-Traversal verhindern
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden');
    }

    serveStatic(req, res, filePath);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     God\'s Eye Sachsen — Lokaler Server           ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  App:   http://localhost:${PORT}                     ║`);
    console.log(`║  Proxy: /api/luis/*  → luis.sachsen.de            ║`);
    console.log(`║         /api/rapis/* → rfrp.rapis-ipm-gis.de     ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  TIPP: Im Browser CONFIG.proxy.enabled = true     ║');
    console.log('║        setzen falls Layer nicht laden.            ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} belegt. Anderer Port: PORT=8081 node server.js`);
    } else {
        console.error('Server-Fehler:', err.message);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\nServer beendet.');
    process.exit(0);
});
