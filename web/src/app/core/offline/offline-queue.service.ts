import { Injectable, signal } from '@angular/core';

export interface QueuedAction {
  id: string;
  url: string;
  method: 'POST' | 'PATCH';
  body: unknown;
  createdAt: number;
}

const DB_NAME = 'bogcha-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

/**
 * Internet uzilganda davomat/ovqat/uyqu kabi amallarni IndexedDB'ga navbatga qo'yadi
 * va ulanish tiklanganda ketma-ket yuboradi (7.3-bo'lim).
 * Har bir amal `clientRequestId` (id maydoni) bilan idempotent — backend takroriy
 * qabul qilinganda uni qayta yozmaydi.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  readonly isOnline = signal(navigator.onLine);
  readonly pendingCount = signal(0);

  private dbPromise: Promise<IDBDatabase> | null = null;
  private flushHandler: ((action: QueuedAction) => Promise<void>) | null = null;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      void this.flush();
    });
    window.addEventListener('offline', () => this.isOnline.set(false));
    void this.refreshPendingCount();
  }

  /** Ulanish tiklanganda navbatdagi har bir amalni qanday yuborishni belgilaydi. */
  registerFlushHandler(handler: (action: QueuedAction) => Promise<void>): void {
    this.flushHandler = handler;
    if (this.isOnline()) {
      void this.flush();
    }
  }

  async enqueue(action: Omit<QueuedAction, 'createdAt'>): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ ...action, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await this.refreshPendingCount();
    if (this.isOnline()) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.flushHandler) return;
    const db = await this.openDb();
    const actions: QueuedAction[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedAction[]);
      req.onerror = () => reject(req.error);
    });

    for (const action of actions.sort((a, b) => a.createdAt - b.createdAt)) {
      try {
        await this.flushHandler(action);
        await this.remove(action.id);
      } catch {
        // Ulanish yana uzilgan bo'lishi mumkin — keyingi 'online' hodisasida qayta urinadi.
        break;
      }
    }
    await this.refreshPendingCount();
  }

  private async remove(id: string): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async refreshPendingCount(): Promise<void> {
    const db = await this.openDb();
    const count: number = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    this.pendingCount.set(count);
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }
}
