// Backend API Configuration
// Update SERVER_IP and SERVER_PORT if your backend is running on a different host/port
const SERVER_IP = 'localhost';
const SERVER_PORT = '8000';
const SERVER_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;

window.CONFIG = {
  SERVER_IP: SERVER_IP,
  SERVER_PORT: SERVER_PORT,
  BASE_URL: SERVER_BASE_URL + '/',
  API_URL: `${SERVER_BASE_URL}/api`,
  UPLOADS_URL: `${SERVER_BASE_URL}/uploads/`
};



