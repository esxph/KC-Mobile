import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Project, ElementsResponse, UnitType } from './api';

const PROJECTS_KEY = 'kc-cache-projects';
const ELEMENTS_KEY = (projectId: string) => `kc-cache-elements:${projectId}`;
const UNIT_TYPES_KEY = 'kc-cache-unit-types';

type CacheEnvelope<T> = { updatedAt: number; data: T };

export async function setCachedProjects(projects: Project[]) {
  const env: CacheEnvelope<Project[]> = { updatedAt: Date.now(), data: projects };
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(env));
}

export async function getCachedProjects(): Promise<Project[] | null> {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as CacheEnvelope<Project[]>;
    return env.data;
  } catch {
    return null;
  }
}

export async function setCachedElements(projectId: string, elements: ElementsResponse) {
  const env: CacheEnvelope<ElementsResponse> = { updatedAt: Date.now(), data: elements };
  await AsyncStorage.setItem(ELEMENTS_KEY(projectId), JSON.stringify(env));
}

export async function getCachedElements(projectId: string): Promise<ElementsResponse | null> {
  const raw = await AsyncStorage.getItem(ELEMENTS_KEY(projectId));
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as CacheEnvelope<ElementsResponse>;
    return env.data;
  } catch {
    return null;
  }
}

export async function setCachedUnitTypes(unitTypes: UnitType[]) {
  const env: CacheEnvelope<UnitType[]> = { updatedAt: Date.now(), data: unitTypes };
  await AsyncStorage.setItem(UNIT_TYPES_KEY, JSON.stringify(env));
}

export async function getCachedUnitTypes(): Promise<UnitType[] | null> {
  const raw = await AsyncStorage.getItem(UNIT_TYPES_KEY);
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as CacheEnvelope<UnitType[]>;
    return env.data;
  } catch {
    return null;
  }
}

