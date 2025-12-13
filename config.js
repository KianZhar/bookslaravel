// Backend API Configuration
// 
// LOCAL DEVELOPMENT: Use localhost (default)
// PRODUCTION (GitHub Pages): Update SERVER_IP to your backend server domain/IP
//
// For local development, keep as is:
const SERVER_IP = 'localhost';
const SERVER_PORT = '8000';

// For production/GitHub Pages, uncomment and update:
// const SERVER_IP = 'your-backend-server.com';  // Your backend server domain
// const SERVER_PORT = '8000';  // Or remove if using standard ports

const SERVER_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;

// For HTTPS backend in production, use:
// const SERVER_BASE_URL = `https://${SERVER_IP}`;

window.CONFIG = {
  SERVER_IP: SERVER_IP,
  SERVER_PORT: SERVER_PORT,
  BASE_URL: SERVER_BASE_URL + '/',
  API_URL: `${SERVER_BASE_URL}/api`,
  UPLOADS_URL: `${SERVER_BASE_URL}/uploads/`
};




