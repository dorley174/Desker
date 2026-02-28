/**
 * API config.
 *
 * BACKEND INTEGRATION: replace VITE_API_BASE_URL with your backend URL and set
 * VITE_USE_MOCK_API=false in .env to switch to real HTTP requests.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? 'true') === 'true';
