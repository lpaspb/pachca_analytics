import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: ['all', 'pachcaanalytics-1-lpaspb97.replit.app', 'analytics.takocrm.ru', 'analytics.pachca.com'],
    proxy: {
      '/api/pachka': {
        target: 'https://api.pachca.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/pachka/, '/api/shared/v1'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, _res) => {
            console.log('proxy error', err);
            console.log('failed request path:', req.url);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
            // Set the correct headers for JSON API
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
            console.log('Content-Type:', proxyRes.headers['content-type'] || 'unknown');

            // Force the content type to JSON if it's coming back as HTML
            if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
              console.log('Warning: Received HTML instead of JSON, attempting to fix response content type');
              proxyRes.headers['content-type'] = 'application/json; charset=utf-8';
            }
          });
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));