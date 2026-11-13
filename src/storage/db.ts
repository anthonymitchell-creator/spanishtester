import { createStore, del, entries, get, set, clear } from 'idb-keyval';

const store = createStore('practica', 'kv');

export const KEYS = ['settings', 'srs', 'stats', 'requests', 'customVerbs'] as const;
export type Key = (typeof KEYS)[number];

export async function load<T>(key: Key): Promise<T | undefined> {
  try {
    return await get<T>(key, store);
  } catch {
    return undefined;
  }
}

export async function save<T>(key: Key, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch (e) {
    console.warn('save failed', key, e);
  }
}

export async function remove(key: Key) {
  await del(key, store);
}

export interface Backup {
  app: 'practica';
  version: 1;
  exportedAt: string;
  data: Partial<Record<Key, unknown>>;
}

export async function exportAll(): Promise<Backup> {
  const all = await entries(store);
  const data: Backup['data'] = {};
  for (const [k, v] of all) if ((KEYS as readonly string[]).includes(String(k))) data[k as Key] = v;
  return { app: 'practica', version: 1, exportedAt: new Date().toISOString(), data };
}

export async function importAll(b: Backup): Promise<void> {
  if (b?.app !== 'practica' || !b.data) throw new Error('Not a Práctica backup file');
  await clear(store);
  for (const k of KEYS) if (b.data[k] !== undefined) await set(k, b.data[k], store);
}

export async function resetAll() {
  await clear(store);
}

/** Ask the browser not to evict our data (Android Chrome honours this for installed PWAs). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}
