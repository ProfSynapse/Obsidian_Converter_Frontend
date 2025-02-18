import { handler } from './build/handler.js';
import express from 'express';
import { CONFIG } from './src/lib/config.js';

const app = express();
const port = process.env.PORT || 3000; // Railway will provide PORT

// Add CORS headers for all routes
app.use((req, res, next) => {
  const allowedOrigins = [CONFIG.CORS.ORIGIN];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', CONFIG.CORS.METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CONFIG.CORS.ALLOWED_HEADERS.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Configure streaming response headers
app.use((req, res, next) => {
  if (req.url.includes('/api/')) {
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }
  next();
});

// Add compression middleware
import compression from 'express-compression';
app.use(compression());

// Increase request size limit
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Add timeout for routes
app.use((req, res, next) => {
  res.setTimeout(600000, () => {
    res.status(408).send('Request timeout');
  });
  next();
});

// Use SvelteKit handler
app.use(handler);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    ORIGIN: CONFIG.CORS.ORIGIN,
    API_URL: CONFIG.API.BASE_URL
  });
});
