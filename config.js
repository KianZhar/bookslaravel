// Backend API Configuration
// ENVIRONMENT DETECTION: Automatically switches between local and production

const isProduction = window.location.hostname === 'kianzhar.github.io';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let SERVER_BASE_URL;
let SERVER_IP;
let SERVER_PORT;

if (isProduction) {
  // PRODUCTION Configuration (GitHub Pages: https://kianzhar.github.io/bookslaravel/)
  // Backend is still on ccs4thyear.com
  SERVER_IP = 'ccs4thyear.com';
  SERVER_PORT = '';
  SERVER_BASE_URL = `https://${SERVER_IP}/Books/Kian_laravel`;
  console.log('🚀 Running in PRODUCTION mode (GitHub Pages)');
} else {
  // LOCAL DEVELOPMENT Configuration
  SERVER_IP = 'localhost';
  SERVER_PORT = '8000';
  SERVER_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
  console.log('💻 Running in DEVELOPMENT mode (localhost)');
}

window.CONFIG = {
  SERVER_IP: SERVER_IP,
  SERVER_PORT: SERVER_PORT,
  BASE_URL: SERVER_BASE_URL + '/',
  API_URL: `${SERVER_BASE_URL}/api`,
  UPLOADS_URL: `${SERVER_BASE_URL}/uploads/`,
  
  ENVIRONMENT: isProduction ? 'production' : 'development',
  WITH_CREDENTIALS: true,
  DEBUG: !isProduction
};

console.log('📡 API Configuration:');
console.log('  - Base URL:', window.CONFIG.BASE_URL);
console.log('  - API URL:', window.CONFIG.API_URL);
console.log('  - Uploads URL:', window.CONFIG.UPLOADS_URL);
console.log('  - Environment:', window.CONFIG.ENVIRONMENT);
