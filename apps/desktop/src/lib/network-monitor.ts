/**
 * Network connectivity monitor with debounce.
 * Detects online/offline transitions and emits events.
 * Debounces rapid flapping to avoid false signals.
 */

type NetworkStatus = "online" | "offline";
type NetworkListener = (status: NetworkStatus) => void;

const DEBOUNCE_MS = 2000;

class NetworkMonitor {
  private listeners: Set<NetworkListener> = new Set();
  private currentStatus: NetworkStatus;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  constructor() {
    this.currentStatus = typeof navigator !== "undefined" && navigator.onLine
      ? "online"
      : "offline";
  }

  /**
   * Initialize event listeners. Call once when the app starts.
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.handleStatusChange("online");
    });

    window.addEventListener("offline", () => {
      this.handleStatusChange("offline");
    });
  }

  /**
   * Debounced status change handler to prevent flapping.
   */
  private handleStatusChange(newStatus: NetworkStatus): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (newStatus !== this.currentStatus) {
        this.currentStatus = newStatus;
        this.notifyListeners();
      }
      this.debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus);
      } catch {
        // Prevent one listener from breaking others
      }
    }
  }

  /**
   * Subscribe to network status changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get the current network status.
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * Check if currently online.
   */
  isOnline(): boolean {
    return this.currentStatus === "online";
  }

  /**
   * Destroy the monitor and clean up resources.
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();
export type { NetworkStatus, NetworkListener };
