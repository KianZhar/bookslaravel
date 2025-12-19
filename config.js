// Backend API Configuration
// ALWAYS USE PRODUCTION SERVER

const SERVER_IP = 'ccs4thyear.com';
const SERVER_PORT = '';
const SERVER_BASE_URL = `https://${SERVER_IP}/Books/Kian_laravel`;

console.log('🚀 Using PRODUCTION server for all environments');

window.CONFIG = {
  SERVER_IP: SERVER_IP,
  SERVER_PORT: SERVER_PORT,
  BASE_URL: SERVER_BASE_URL + '/',
  API_URL: `${SERVER_BASE_URL}/api`,
  UPLOADS_URL: `${SERVER_BASE_URL}/uploads/`,
  
  ENVIRONMENT: 'production',
  WITH_CREDENTIALS: true,
  DEBUG: false
};

console.log('📡 API Configuration:');
console.log('  - Base URL:', window.CONFIG.BASE_URL);
console.log('  - API URL:', window.CONFIG.API_URL);
console.log('  - Uploads URL:', window.CONFIG.UPLOADS_URL);
console.log('  - Environment:', window.CONFIG.ENVIRONMENT);
