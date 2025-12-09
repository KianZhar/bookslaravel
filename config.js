// config.js for GitHub Pages - Production
// COPY THIS FILE TO GITHUB AND RENAME TO config.js
const SERVER_IP = 'books.muccs.site';
const SERVER_PORT = '';

const SERVER_BASE_URL = SERVER_PORT 
  ? `https://${SERVER_IP}:${SERVER_PORT}` 
  : `https://${SERVER_IP}`;

window.CONFIG = {
  SERVER_IP: SERVER_IP,
  SERVER_PORT: SERVER_PORT,
  BASE_URL: SERVER_BASE_URL + '/',
  API_URL: `${SERVER_BASE_URL}/api`,
  UPLOADS_URL: `${SERVER_BASE_URL}/uploads/`
};

console.log('Frontend Config:', {
  API_URL: window.CONFIG.API_URL,
  UPLOADS_URL: window.CONFIG.UPLOADS_URL
});


