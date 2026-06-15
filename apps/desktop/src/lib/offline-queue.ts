/**
 * Offline-first upload queue with IndexedDB persistence.
 * Stores pending uploads when offline, monitors navigator.onLine,
 * and auto-resumes on reconnection.
 * Implements pause/resume/retry logic.
 */

import { networkMonitor } from "./network-monitor";
import { uploadFile, ChunkUploadProgress } from "./chunked-uploader";

export interface QueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  eventId: string;
  status: "pending" | "uploading" | "paused" | "completed" | "failed";
  progress: number;
  chunksCompleted: number;
  totalChunks: number;
  speed: number;
  error?: string;
  addedAt: number;
  /** We store a reference key; actual File object kept in memory map */
  fileRef: string;
}

const DB_NAME = "snapdeliver-upload-queue";
const DB_VERSION = 1;
const STORE_NAME = "uploads";

type QueueChangeListener = (items: QueueItem[]) => void;

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private items: Map<string, QueueItem> = new Map();
  private fileMap: Map<string, File> = new Map();
  private listeners: Set<QueueChangeListener> = new Set();
  private processing = false;
  private paused = false;
  private abortControllers: Map<string, AbortController> = new Map();
  private unsubscribeNetwork: (() => void) | null = null;

  /**
   * Initialize the queue - opens IndexedDB and loads persisted items.
   */
  async init(): Promise<void> {
    await this.openDatabase();
    await this.loadFromDB();

    // Set up network monitoring for auto-resume
    networkMonitor.init();
    this.unsubscribeNetwork = networkMonitor.subscribe((status) => {
      if (status === "online" && !this.paused) {
        this.processQueue();
      }
    });
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };
    });
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: QueueItem[] = request.result || [];
        for (const item of items) {
          // Reset uploading items to pending on reload
          if (item.status === "uploading") {
            item.status = "pending";
          }
          this.items.set(item.id, item);
        }
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => {
        resolve();
      };
    });
  }

  private async saveItem(item: QueueItem): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ ...item, fileRef: item.fileRef });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private async removeItem(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private notifyListeners(): void {
    const items = this.getAll();
    for (const listener of this.listeners) {
      try {
        listener(items);
      } catch {
        // Prevent listener errors from propagating
      }
    }
  }

  /**
   * Add files to the upload queue.
   */
  async addFiles(files: File[], eventId: string): Promise<void> {
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const totalChunks = Math.ceil(file.size / (5 * 1024 * 1024));

      const item: QueueItem = {
        id,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
        eventId,
        status: "pending",
        progress: 0,
        chunksCompleted: 0,
        totalChunks,
        speed: 0,
        addedAt: Date.now(),
        fileRef: id,
      };

      this.items.set(id, item);
      this.fileMap.set(id, file);
      await this.saveItem(item);
    }

    this.notifyListeners();

    // Start processing if online
    if (networkMonitor.isOnline() && !this.paused) {
      this.processQueue();
    }
  }

  /**
   * Process the queue - upload pending items one at a time.
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.paused) return;
    if (!networkMonitor.isOnline()) return;

    this.processing = true;

    try {
      while (true) {
        if (this.paused || !networkMonitor.isOnline()) break;

        const nextItem = this.getNextPending();
        if (!nextItem) break;

        await this.processItem(nextItem);
      }
    } finally {
      this.processing = false;
    }
  }

  private getNextPending(): QueueItem | undefined {
    for (const item of this.items.values()) {
      if (item.status === "pending") {
        return item;
      }
    }
    return undefined;
  }

  private async processItem(item: QueueItem): Promise<void> {
    const file = this.fileMap.get(item.fileRef);
    if (!file) {
      item.status = "failed";
      item.error = "File reference lost (app may have been restarted)";
      await this.saveItem(item);
      this.notifyListeners();
      return;
    }

    item.status = "uploading";
    await this.saveItem(item);
    this.notifyListeners();

    const abortController = new AbortController();
    this.abortControllers.set(item.id, abortController);

    const result = await uploadFile(
      file,
      item.eventId,
      item.id,
      (progress: ChunkUploadProgress) => {
        item.chunksCompleted = progress.chunkIndex;
        item.progress = (progress.bytesUploaded / progress.totalBytes) * 100;
        item.speed = progress.speed;
        this.notifyListeners();
      },
      abortController.signal
    );

    this.abortControllers.delete(item.id);

    if (result.success) {
      item.status = "completed";
      item.progress = 100;
    } else {
      item.status = "failed";
      item.error = result.error;
    }

    await this.saveItem(item);
    this.notifyListeners();
  }

  /**
   * Pause all uploads.
   */
  pauseAll(): void {
    this.paused = true;

    // Abort any in-progress uploads
    for (const [id, controller] of this.abortControllers) {
      controller.abort();
      const item = this.items.get(id);
      if (item) {
        item.status = "paused";
      }
    }
    this.abortControllers.clear();
    this.notifyListeners();
  }

  /**
   * Resume all paused uploads.
   */
  resumeAll(): void {
    this.paused = false;

    // Set paused items back to pending
    for (const item of this.items.values()) {
      if (item.status === "paused") {
        item.status = "pending";
      }
    }
    this.notifyListeners();

    if (networkMonitor.isOnline()) {
      this.processQueue();
    }
  }

  /**
   * Retry all failed uploads.
   */
  retryFailed(): void {
    for (const item of this.items.values()) {
      if (item.status === "failed") {
        item.status = "pending";
        item.error = undefined;
        item.progress = 0;
        item.chunksCompleted = 0;
      }
    }
    this.notifyListeners();

    if (networkMonitor.isOnline() && !this.paused) {
      this.processQueue();
    }
  }

  /**
   * Remove completed items from the queue.
   */
  async clearCompleted(): Promise<void> {
    for (const [id, item] of this.items) {
      if (item.status === "completed") {
        this.items.delete(id);
        this.fileMap.delete(id);
        await this.removeItem(id);
      }
    }
    this.notifyListeners();
  }

  /**
   * Get all queue items as an array.
   */
  getAll(): QueueItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => a.addedAt - b.addedAt
    );
  }

  /**
   * Subscribe to queue changes.
   */
  subscribe(listener: QueueChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Destroy the queue and clean up resources.
   */
  destroy(): void {
    this.pauseAll();
    this.listeners.clear();
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
