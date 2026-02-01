const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 2857;

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function proxyToOpenAI(req, res) {
  const parsedUrl = url.parse(req.url);

  // Determine target from X-Base-URL header or default to OpenAI
  const customBaseUrl = req.headers['x-base-url'];
  let targetHost = 'api.openai.com';
  let targetPort = 443;
  let basePath = '/v1';
  let targetProtocol = https;

  if (customBaseUrl) {
    try {
      const parsed = new URL(customBaseUrl);
      targetHost = parsed.hostname;
      targetPort = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
      basePath = parsed.pathname.replace(/\/$/, '') || '/v1';
      targetProtocol = parsed.protocol === 'http:' ? http : https;
    } catch (e) {
      console.error('Invalid X-Base-URL:', customBaseUrl);
    }
  }

  const apiPath = parsedUrl.path.replace(/^\/api/, basePath);

  console.log(`Proxying: ${req.method} ${apiPath} -> ${targetHost}`);

  // Remove internal header before forwarding
  const forwardHeaders = { ...req.headers, host: targetHost };
  delete forwardHeaders['x-base-url'];

  const options = {
    hostname: targetHost,
    port: targetPort,
    path: apiPath,
    method: req.method,
    headers: forwardHeaders,
  };

  const proxyReq = targetProtocol.request(options, (proxyRes) => {
    // Forward status code and headers
    res.writeHead(proxyRes.statusCode, proxyRes.headers);

    // Stream the response
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  });

  // Stream the request body
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);

  // Proxy API requests to OpenAI
  if (pathname.startsWith('/api/')) {
    proxyToOpenAI(req, res);
    return;
  }

  // Serve static files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Proxying OpenAI API requests through this server`);
});
