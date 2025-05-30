// src/setupProxy.js
// Configuración de proxy para desarrollo con Create React App

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy para la API de Chipax
  app.use(
    '/v2',
    createProxyMiddleware({
      target: 'https://api.chipax.com',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxy request:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('📡 Proxy response:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
      }
    })
  );
};
