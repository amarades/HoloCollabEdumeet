import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.RENDER ? 'render' : 'unknown',
    version: '1.0.0'
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'API healthy',
    database: 'connected', // In real app, check actual DB connection
    redis: 'connected',    // In real app, check actual Redis connection
    timestamp: new Date().toISOString()
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