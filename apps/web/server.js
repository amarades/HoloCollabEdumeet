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

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy API requests to FastAPI backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    // No rewrite needed if backend also uses /api prefix
    // '^/api': '/api', 
  },
  onError: (err, req, res) => {
    console.error('Proxy Error (API):', err);
    res.status(502).json({ error: 'Backend service unavailable', details: err.message });
  }
}));

// Proxy WebSocket requests to Realtime service
app.use('/ws', createProxyMiddleware({
  target: REALTIME_URL,
  ws: true,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy Error (WS):', err);
  }
}));

// Health check endpoint for Render
app.get('/health', async (req, res) => {
  let backendStatus = 'unknown';
  let realtimeStatus = 'unknown';
  
  try {
    const resp = await fetch(`${BACKEND_URL}/health`);
    const data = await resp.json();
    backendStatus = data.status || 'healthy';
  } catch (err) {
    backendStatus = 'unreachable';
  }

  try {
    const resp = await fetch(`${REALTIME_URL}/health`);
    const data = await resp.json();
    realtimeStatus = data.status || 'healthy';
  } catch (err) {
    realtimeStatus = 'unreachable';
  }

  res.status(200).json({
    status: 'healthy',
    backend: backendStatus,
    realtime: realtimeStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.RENDER ? 'render' : 'unknown',
    version: '1.0.2'
  });
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HoloCollab EduMeet server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 App: http://localhost:${PORT}`);
});