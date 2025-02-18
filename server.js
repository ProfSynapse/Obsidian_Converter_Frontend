import { handler } from './build/handler.js';
import express from 'express';
import { CONFIG } from './src/lib/config.js';

const app = express();
const port = process.env.PORT || 3000; // Railway will provide PORT

// Add CORS headers for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow from same origin, or frontend domain in production
  if (origin === CONFIG.CORS.ORIGIN || req.headers.host === CONFIG.CORS.ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }

  next();
});

// Increase request size limit for file uploads
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
