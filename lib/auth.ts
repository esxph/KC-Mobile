import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as b64decode } from 'base-64';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
const ACCESS_KEY = 'kc-access-token';
const REFRESH_KEY = 'kc-refresh-token';

export type JwtPayload = Record<string, any> & { exp?: number; iat?: number };

export function decodeJwt(jwt: string): JwtPayload | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payloadBase64Url = parts[1];
    const base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(base64) : b64decode(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([[ACCESS_KEY, accessToken], [REFRESH_KEY, refreshToken]]);
}

export async function getAccessToken(): Promise<string | null> {
  const v = await AsyncStorage.getItem(ACCESS_KEY);
  return v;
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export async function loginWithCredentials(email: string, password: string): Promise<{ access_token: string; refresh_token: string; payload: JwtPayload | null }> {
  // JSON login as requested (server should allow CORS for this route)
  const res = await fetch(API_BASE_URL + '/api/jwt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error('Login failed (' + res.status + ')');
  }
  const json = await res.json();
  const access: string = json.access_token;
  const refresh: string = json.refresh_token;
  await setTokens(access, refresh);
  const payload = decodeJwt(access);
  return { access_token: access, refresh_token: refresh, payload };
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export function isTokenExpiringSoon(jwt: string, bufferSeconds = 60): boolean {
  const payload = decodeJwt(jwt);
  if (!payload?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp - nowSec <= bufferSeconds;
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshTokensIfNeeded(): Promise<string | null> {
  const current = await getAccessToken();
  if (!current) return null;
  if (!isTokenExpiringSoon(current)) return current;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) {
      await clearTokens();
      refreshInFlight = null;
      return null;
    }
    const res = await fetch(API_BASE_URL + '/api/jwt/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      await clearTokens();
      refreshInFlight = null;
      return null;
    }
    const json = await res.json();
    const accessNew: string = json.access_token;
    const refreshNew: string = json.refresh_token ?? refresh;
    await setTokens(accessNew, refreshNew);
    refreshInFlight = null;
    return accessNew;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

