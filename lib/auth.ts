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
  const res = await fetch(API_BASE_URL + '/api/jwt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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

