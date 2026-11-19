/* global process */
const isCI = process.env.CI === 'true' || process.env.CI === '1';

export const API = process.env.TEST_API_URL || (
  isCI ? 'http://localhost:8000/api' : 'http://localhost:8001/api'
);

export const BASE_URL = process.env.TEST_BASE_URL || (
  isCI ? 'http://localhost:5173' : 'http://localhost:5174'
);

export const WEB_SERVER_URL = process.env.TEST_WEB_SERVER_URL || (
  isCI ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:5174'
);
