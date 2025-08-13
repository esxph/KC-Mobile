import { getAccessToken, refreshTokensIfNeeded } from './auth';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

export type Project = { id: string; name: string };
export type ElementsResponse = {
  partidas: Array<{ id: string; name: string }>;
  subpartidas: Array<{ id: string; name: string; partida_id: string }>;
  conceptos: Array<{ id: string; name: string; subpartida_id: string }>;
  subconceptos: Array<{ id: string; name: string; concepto_id: string }>;
};

async function getAuthHeader() {
  await refreshTokensIfNeeded();
  const jwt = await getAccessToken();
  return jwt ? { Authorization: 'Bearer ' + jwt } : {};
}

export async function fetchProjects(): Promise<Project[]> {
  const headers = { ...(await getAuthHeader()) } as Record<string, string>;
  const res = await fetch(API_BASE_URL + '/api/mobile/projects', { headers, method: 'GET' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load projects');
  }
  const json = await res.json();
  return json.projects as Project[];
}

export async function fetchElements(projectId: string): Promise<ElementsResponse> {
  const headers = { ...(await getAuthHeader()) } as Record<string, string>;
  const url = new URL(API_BASE_URL + '/api/mobile/elements');
  url.searchParams.set('projectId', projectId);
  const res = await fetch(url.toString(), { headers, method: 'GET' });
  if (!res.ok) {
    if (res.status === 400) throw new Error('Missing projectId');
    if (res.status === 401) throw new Error('Unauthorized');
    if (res.status === 403) throw new Error('Forbidden');
    throw new Error('Failed to load elements');
  }
  return (await res.json()) as ElementsResponse;
}

export type ReportType = 'partida' | 'subpartida' | 'concepto' | 'subconcepto';

export async function createReport(params: {
  projectId: string;
  type: ReportType;
  name: string;
  objectId?: string;
  comment?: string;
  payload?: any;
  data?: any;
}): Promise<{ id: string; message: string }> {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...(await getAuthHeader()) } as Record<string, string>;
  const body = JSON.stringify(params);
  const res = await fetch(API_BASE_URL + '/api/reports', {
    method: 'POST',
    headers,
    body,
  });
  if (!res.ok) {
    throw new Error('Failed to create report (' + res.status + ')');
  }
  return res.json();
}

export async function uploadMedia(params: {
  fileUri: string;
  fileName: string;
  mimeType: string;
  projectName: string;
  elementName: string;
  hierarchyPath?: string;
}, options?: { signal?: AbortSignal }): Promise<{ success: boolean; message: string; assetId: string; description: string }> {
  await refreshTokensIfNeeded();
  const jwt = await getAccessToken();
  if (!jwt) {
    throw new Error('Not authenticated');
  }
  const form = new FormData();
  // Build file part per platform
  if (Platform.OS === 'web') {
    const resp = await fetch(params.fileUri);
    const blob = await resp.blob();
    const file = new File([blob], params.fileName, { type: params.mimeType });
    form.append('file', file);
  } else {
    // React Native style file descriptor
    // @ts-ignore
    form.append('file', { uri: params.fileUri, name: params.fileName, type: params.mimeType });
  }
  form.append('projectName', params.projectName);
  form.append('elementName', params.elementName);
  if (params.hierarchyPath) form.append('hierarchyPath', params.hierarchyPath);
  const res = await fetch(API_BASE_URL + '/api/mobile/media/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + jwt, Accept: 'application/json' },
    body: form,
    signal: options?.signal,
  });
  if (!res.ok) {
    let msg: string;
    try { msg = await res.text(); } catch { msg = 'Upload failed'; }
    throw new Error(`Upload failed (${res.status}): ${msg}`);
  }
  return res.json();
}
