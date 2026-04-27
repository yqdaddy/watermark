/**
 * 用户保存的参数模版存储 Provider
 *
 * IndexedDB + localStorage 分层存储：
 * - 小配置（< 50KB）存 localStorage，快速同步读取
 * - 大配置（>= 50KB）存 IndexedDB，无大小限制
 */

import type { SavedParamTemplate, SavedParamTemplatesStorage } from "./types";

const LOCAL_STORAGE_KEY = "watermark.saved-param-templates.v1";
const INDEXED_DB_NAME = "watermark-saved-templates";
const INDEXED_DB_VERSION = 1;
const STORE_NAME = "templates";
const SIZE_THRESHOLD = 50 * 1024; // 50 KB

let indexedDBInstance: IDBDatabase | null = null;

/**
 * 初始化 IndexedDB
 */
async function initIndexedDB(): Promise<IDBDatabase> {
  if (indexedDBInstance) return indexedDBInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      indexedDBInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * 计算对象大小（字节）
 */
function calculateSize(obj: unknown): number {
  const json = JSON.stringify(obj);
  return new Blob([json]).size;
}

/**
 * 从 localStorage 加载所有模版
 */
function loadFromLocalStorage(): SavedParamTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];

    const storage = JSON.parse(raw) as SavedParamTemplatesStorage;
    return storage.templates || [];
  } catch {
    return [];
  }
}

/**
 * 从 IndexedDB 加载所有大模版
 */
async function loadFromIndexedDB(): Promise<SavedParamTemplate[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch {
    return [];
  }
}

/**
 * 加载所有已保存的参数模版
 *
 * 合并 localStorage 和 IndexedDB 数据
 */
export async function loadSavedParamTemplates(): Promise<SavedParamTemplate[]> {
  const localStorageTemplates = loadFromLocalStorage();
  const indexedDBTemplates = await loadFromIndexedDB();

  // 合并并去重（按 id）
  const allTemplates = [...localStorageTemplates, ...indexedDBTemplates];
  const uniqueTemplates = new Map<string, SavedParamTemplate>();
  for (const template of allTemplates) {
    uniqueTemplates.set(template.id, template);
  }

  return Array.from(uniqueTemplates.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 保存参数模版
 *
 * 根据大小自动选择存储位置
 */
export async function saveSavedParamTemplate(template: SavedParamTemplate): Promise<void> {
  const size = calculateSize(template);

  if (size < SIZE_THRESHOLD) {
    // 存 localStorage
    saveToLocalStorage(template);
  } else {
    // 存 IndexedDB
    await saveToIndexedDB(template);
  }
}

/**
 * 保存到 localStorage
 */
function saveToLocalStorage(template: SavedParamTemplate): void {
  if (typeof window === "undefined") return;

  try {
    const existing = loadFromLocalStorage();
    const updated = existing.filter((t) => t.id !== template.id);
    updated.push(template);

    const storage: SavedParamTemplatesStorage = {
      version: 1,
      templates: updated,
      lastCleanupAt: Date.now(),
    };

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error("Failed to save template to localStorage:", error);
  }
}

/**
 * 保存到 IndexedDB
 */
async function saveToIndexedDB(template: SavedParamTemplate): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(template);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Failed to save template to IndexedDB:", error);
  }
}

/**
 * 更新参数模版
 */
export async function updateSavedParamTemplate(template: SavedParamTemplate): Promise<void> {
  template.updatedAt = Date.now();
  await saveSavedParamTemplate(template);
}

/**
 * 删除参数模版
 *
 * 同时清理 localStorage 和 IndexedDB
 */
export async function deleteSavedParamTemplate(id: string): Promise<void> {
  if (typeof window === "undefined") return;

  // 删除 localStorage
  try {
    const existing = loadFromLocalStorage();
    const updated = existing.filter((t) => t.id !== id);

    const storage: SavedParamTemplatesStorage = {
      version: 1,
      templates: updated,
      lastCleanupAt: Date.now(),
    };

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error("Failed to delete template from localStorage:", error);
  }

  // 删除 IndexedDB
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Failed to delete template from IndexedDB:", error);
  }
}

/**
 * 清理所有已保存模版
 */
export async function clearAllSavedParamTemplates(): Promise<void> {
  if (typeof window === "undefined") return;

  // 清理 localStorage
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);

  // 清理 IndexedDB
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Failed to clear IndexedDB templates:", error);
  }
}