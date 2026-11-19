const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const API_BASE = configuredApiUrl.replace(/\/$/, '');
