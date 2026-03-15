import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const REALTIME_URL = process.env.REALTIME_URL || 'http://localhost:8002';

// 1. Proxy API requests (MUST be before static middleware)
// Preserve /api prefix by NOT stripping it
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy] API: ${req.method} ${req.url} -> ${BACKEND_URL}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy Error (API):', err);
    res.status(502).json({ error: 'Backend service unavailable', details: err.message });
  }
}));

// 2. Proxy WebSocket requests
app.use('/ws', createProxyMiddleware({
  target: REALTIME_URL,
  ws: true,
  changeOrigin: true,
  onProxyReqWs: (proxyReq, req, socket, options, head) => {
    console.log(`[Proxy] WS: ${req.url} -> ${REALTIME_URL}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy Error (WS):', err);
  }
}));

// 3. Health check endpoint (for Render and diagnostics)
app.get('/health', async (req, res) => {
  let backendStatus = 'unknown';
  let realtimeStatus = 'unknown';
  let backendError = null;
  let realtimeError = null;
  
  try {
    const resp = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
        const data = await resp.json();
        backendStatus = data.status || 'healthy';
    } else {
        backendStatus = `error-${resp.status}`;
    }
  } catch (err) {
    backendStatus = 'unreachable';
    backendError = err.message;
  }

  try {
    const resp = await fetch(`${REALTIME_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
        const data = await resp.json();
        realtimeStatus = data.status || 'healthy';
    } else {
        realtimeStatus = `error-${resp.status}`;
    }
  } catch (err) {
    realtimeStatus = 'unreachable';
    realtimeError = err.message;
  }

  res.status(200).json({
    status: 'healthy',
    backend: { status: backendStatus, error: backendError, url: BACKEND_URL },
    realtime: { status: realtimeStatus, error: realtimeError, url: REALTIME_URL },
    timestamp: new Date().toISOString(),
    version: '1.0.3'
  });
});

// 4. Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// 5. Catch-all handler for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HoloCollab EduMeet server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 App: http://localhost:${PORT}`);
});