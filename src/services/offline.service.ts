// ─────────────────────────────────────────────────────────────
// src/services/offline.service.ts
//
// Manages the offline mutation queue using IndexedDB.
// When the device is offline, Convex mutations are queued here
// and replayed in-order when connectivity is restored.
// ─────────────────────────────────────────────────────────────

export interface QueuedMutation {
  id: string;           // uuid
  name: string;         // Convex function name
  args: unknown;        // serialised mutation args
  enqueuedAt: number;   // timestamp
  retryCount: number;
}

const DB_NAME = "madvibe-offline";
const STORE_NAME = "mutation-queue";
const DB_VERSION = 1;

class OfflineService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined") return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async enqueue(mutation: Omit<QueuedMutation, "id" | "enqueuedAt" | "retryCount">): Promise<void> {
    if (!this.db) await this.init();
    const entry: QueuedMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      enqueuedAt: Date.now(),
      retryCount: 0,
    };
    return this.write("add", entry);
  }

  async dequeue(id: string): Promise<void> {
    if (!this.db) await this.init();
    return this.write("delete", id);
  }

  async getAll(): Promise<QueuedMutation[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    return this.write("clear", undefined);
  }

  private write(op: "add" | "delete" | "clear", value?: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req =
        op === "add" ? store.add(value) :
          op === "delete" ? store.delete(value as string) :
            store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const offlineService = new OfflineService();
export default offlineService;
