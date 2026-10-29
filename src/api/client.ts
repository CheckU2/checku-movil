import * as SecureStore from 'expo-secure-store';
import type { ApiEnvelope, Tokens } from '../types/models';

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const ACCESS = 'checku_access';
const REFRESH = 'checku_refresh';
let refreshing: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH, tokens.refresh_token);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH)]);
}

async function parse(response: Response): Promise<any> {
  const body = await response.text();
  if (!body) return null;
  try { return JSON.parse(body); } catch { return null; }
}

function errorMessage(body: any, status: number): string {
  return body?.detail?.message ?? (typeof body?.detail === 'string' ? body.detail : null)
    ?? body?.message ?? `Error de conexión con el servidor (${status}).`;
}

async function renew(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const token = await SecureStore.getItemAsync(REFRESH);
      if (!token) return null;
      try {
        const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: token }),
        });
        const payload = await parse(response);
        if (!response.ok || !payload?.data?.access_token || !payload?.data?.refresh_token) {
          await clearTokens(); return null;
        }
        await saveTokens(payload.data);
        return payload.data.access_token as string;
      } catch { return null; }
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  if (!baseUrl) throw new ApiError('Configura EXPO_PUBLIC_API_URL en tu archivo .env.', 0);
  const token = authenticated ? await SecureStore.getItemAsync(ACCESS) : null;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${baseUrl}/api/v1${path}`, { ...options, headers }); }
  catch { throw new ApiError('No se pudo conectar. Revisa tu red y la dirección del servidor.', 0); }
  if (response.status === 401 && authenticated && token) {
    const updated = await renew();
    if (updated) {
      headers.set('Authorization', `Bearer ${updated}`);
      response = await fetch(`${baseUrl}/api/v1${path}`, { ...options, headers });
    }
  }
  const payload = await parse(response);
  if (!response.ok) throw new ApiError(errorMessage(payload, response.status), response.status);
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<ApiEnvelope<T>>(path).then(r => r.data),
  post: <T>(path: string, body: unknown) => request<ApiEnvelope<T>>(path, { method: 'POST', body: JSON.stringify(body) }).then(r => r.data),
};
