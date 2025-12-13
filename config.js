// Backend API Configuration
// 
// PRODUCTION (GitHub Pages): Connected to Hostinger backend
// Frontend: https://kianzhar.github.io/bookslaravel/
// Backend: https://ccs4thyear.com/Books/Kian_Laravel/

// Production backend URL
const SERVER_BASE_URL = 'https://ccs4thyear.com/Books/Kian_Laravel';

// For local development, uncomment these lines and comment out SERVER_BASE_URL above:
// const SERVER_IP = 'localhost';
// const SERVER_PORT = '8000';
// const SERVER_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;

window.CONFIG = {
  BASE_URL: SERVER_BASE_URL + '/',
  API_URL: `${SERVER_BASE_URL}/api`,
  UPLOADS_URL: `${SERVER_BASE_URL}/uploads/`
};




