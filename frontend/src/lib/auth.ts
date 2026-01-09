
import { createInternalNeonAuth } from '@neondatabase/neon-js/auth';

const baseURL = import.meta.env.VITE_NEON_AUTH_URL;

if (!baseURL) {
  throw new Error('VITE_NEON_AUTH_URL is not set');
}

const neonAuth = createInternalNeonAuth(baseURL);

export const authClient = neonAuth.adapter;
export const getAuthToken = neonAuth.getJWTToken;
