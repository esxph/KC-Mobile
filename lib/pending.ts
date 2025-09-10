import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingMedia = { uri: string; fileName: string; mimeType: string };
export type PendingReport = {
  id: string;
  createdAt: number;
  projectId: string;
  type: 'partida' | 'subpartida' | 'concepto' | 'subconcepto';
  objectId?: string;
  name: string;
  comment?: string;
  quantity?: string; // quantity as text field
  unitType?: string; // unit type ID
  media: PendingMedia[];
  isDraft?: boolean; // true if this is a draft, false/undefined if it's a regular pending item
};

const KEY = 'kc-pending-reports';

export async function loadPending(): Promise<PendingReport[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as PendingReport[]; } catch { return []; }
}

export async function savePending(list: PendingReport[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function addPending(report: Omit<PendingReport, 'id' | 'createdAt'>) {
  const list = await loadPending();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const item: PendingReport = { id, createdAt: Date.now(), ...report };
  list.unshift(item);
  await savePending(list);
  return item;
}

export async function removePending(id: string) {
  const list = await loadPending();
  await savePending(list.filter(r => r.id !== id));
}

export async function updatePendingMedia(id: string, media: PendingMedia[]) {
  const list = await loadPending();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], media };
  await savePending(list);
}

export async function updatePendingDetails(id: string, details: Partial<Pick<PendingReport, 'name' | 'comment' | 'quantity' | 'unitType'>>) {
  const list = await loadPending();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...details };
  await savePending(list);
}
