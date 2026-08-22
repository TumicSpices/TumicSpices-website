import { createApiMiddleware } from '../server/api.js';

const apiMiddleware = createApiMiddleware();

/**
 * Vercel Serverless Function entry point for all /api/* routes.
 * Seamlessly handles requests in production Vercel deployment.
 */
export default async function handler(req, res) {
  return new Promise((resolve) => {
    apiMiddleware(req, res, () => {
      // 404 Fallback if no matching API endpoint
      if (!res.writableEnded) {
        if (typeof res.status === 'function' && typeof res.json === 'function') {
          res.status(404).json({ success: false, error: `API endpoint not found: ${req.url}` });
        } else {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: `API endpoint not found: ${req.url}` }));
        }
      }
      resolve();
    }).then(resolve).catch((err) => {
      console.error('[Vercel API Serverless Handler Error]:', err);
      if (!res.writableEnded) {
        if (typeof res.status === 'function' && typeof res.json === 'function') {
          res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
        }
      }
      resolve();
    });
  });
}
