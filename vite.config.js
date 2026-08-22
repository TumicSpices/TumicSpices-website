import { defineConfig, loadEnv } from 'vite';
import { createApiMiddleware } from './server/api.js';

export default defineConfig(({ mode }) => {
  // Load all environment variables from .env into process.env for server-side use
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false
    },
    plugins: [
      {
        name: 'tumic-backend-api',
        configureServer(server) {
          server.middlewares.use(createApiMiddleware());
        }
      }
    ]
  };
});
