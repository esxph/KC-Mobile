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
  media: PendingMedia[];
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
