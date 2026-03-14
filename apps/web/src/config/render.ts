// Render-specific configuration for HoloCollab EduMeet
// This file contains Render-specific settings and optimizations

export const RENDER_CONFIG = {
  // Render provides PORT environment variable
  port: process.env.PORT || 10000,

  // Free tier optimizations
  isFreeTier: process.env.RENDER_INSTANCE_TYPE === 'free' ||
              process.env.ENVIRONMENT === 'free',

  // Render-specific environment detection
  isRender: process.env.RENDER === 'true' ||
            !!process.env.RENDER_SERVICE_ID,

  // Health check endpoint for Render
  healthCheck: {
    enabled: true,
    path: '/health',
    interval: 30, // seconds
  },

  // Database connection settings for Render
  database: {
    // Use connection pooling for better performance
    connectionTimeoutMillis: 20000,
    query_timeout: 20000,
    statement_timeout: 60000,

    // Connection pool settings
    max: 5, // Limited for free tier
    min: 1,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },

  // Redis settings for Upstash
  redis: {
    // Upstash-specific settings
    family: 6, // IPv6 support
    keyPrefix: 'holocollab:',

    // Free tier limits
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,

    // Connection settings
    connectTimeout: 60000,
    commandTimeout: 5000,
    lazyConnect: true,
  },

  // WebRTC settings for free tier
  webrtc: {
    // Use free tier WebRTC manager
    useFreeTierManager: true,

    // STUN servers only (no TURN for free tier)
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],

    // Free tier video constraints
    videoConstraints: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15, max: 20 },
    },

    // Participant limits
    maxParticipants: 4,
  },

  // Feature flags for free tier
  features: {
    ai: false,
    cv: false,
    fileUploads: false,
    recording: false,
    livekit: false,
    turn: false,
  },

  // Performance settings for free tier
  performance: {
    // Reduce bundle size
    enableBundleAnalyzer: false,

    // Disable heavy features
    disableAnimations: false,
    reduceImageQuality: true,

    // Caching settings
    cacheTimeout: 300, // 5 minutes
    sessionTimeout: 1800, // 30 minutes
  },

  // Monitoring for Render
  monitoring: {
    // Basic health checks
    enableHealthChecks: true,

    // Error reporting (optional)
    enableSentry: false,

    // Performance monitoring
    enablePerformanceMonitoring: false,
  },

  // CDN and asset optimization
  assets: {
    // Use free CDNs for better performance
    useCdn: true,
    cdnBaseUrl: 'https://cdn.jsdelivr.net/npm/',

    // Compress assets
    enableCompression: true,

    // Cache headers
    cacheControl: 'public, max-age=31536000', // 1 year
  },
};

// Export for use in the application
export default RENDER_CONFIG;