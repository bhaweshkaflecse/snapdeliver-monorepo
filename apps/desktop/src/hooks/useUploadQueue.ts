import { useState, useEffect, useCallback, useRef } from "react";
import { offlineQueue, QueueItem } from "../lib/offline-queue";
import type { UploadItem } from "../components/UploadProgress";

/**
 * React hook wrapping the offline queue with state management.
 * Provides reactive access to queue state and control methods.
 */
export function useUploadQueue() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize the queue
    offlineQueue.init().then(() => {
      setQueue(mapItems(offlineQueue.getAll()));
    });

    // Subscribe to changes
    const unsubscribe = offlineQueue.subscribe((items) => {
      setQueue(mapItems(items));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const eventId =
      localStorage.getItem("default_event_id") || "default-event";
    offlineQueue.addFiles(files, eventId);
  }, []);

  const pauseAll = useCallback(() => {
    offlineQueue.pauseAll();
  }, []);

  const resumeAll = useCallback(() => {
    offlineQueue.resumeAll();
  }, []);

  const retryFailed = useCallback(() => {
    offlineQueue.retryFailed();
  }, []);

  const clearCompleted = useCallback(() => {
    offlineQueue.clearCompleted();
  }, []);

  return {
    queue,
    addFiles,
    pauseAll,
    resumeAll,
    retryFailed,
    clearCompleted,
  };
}

/**
 * Map internal QueueItem to UploadItem for the UI component.
 */
function mapItems(items: QueueItem[]): UploadItem[] {
  return items.map((item) => ({
    id: item.id,
    fileName: item.fileName,
    fileSize: item.fileSize,
    status: item.status,
    progress: item.progress,
    chunksCompleted: item.chunksCompleted,
    totalChunks: item.totalChunks,
    speed: item.speed,
    error: item.error,
  }));
}
