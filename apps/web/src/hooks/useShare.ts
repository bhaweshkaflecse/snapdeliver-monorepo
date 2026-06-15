"use client";

import { useCallback, useMemo } from "react";

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface UseShareReturn {
  isSupported: boolean;
  isFileShareSupported: boolean;
  share: (data: ShareData) => Promise<boolean>;
  downloadFallback: (url: string, filename: string) => void;
}

export function useShare(): UseShareReturn {
  const isSupported = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return !!navigator.share;
  }, []);

  const isFileShareSupported = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return !!navigator.canShare;
  }, []);

  const share = useCallback(
    async (data: ShareData): Promise<boolean> => {
      if (!isSupported) return false;

      try {
        // Check if we can share files
        if (data.files && data.files.length > 0) {
          if (navigator.canShare && navigator.canShare({ files: data.files })) {
            await navigator.share({
              title: data.title,
              text: data.text,
              files: data.files,
            });
            return true;
          }
          // If file sharing not supported, fall back to URL sharing
          const shareData: ShareData = { title: data.title, text: data.text };
          if (data.url) shareData.url = data.url;
          await navigator.share(shareData);
          return true;
        }

        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });
        return true;
      } catch (err) {
        // User cancelled or share failed
        if (err instanceof Error && err.name === "AbortError") {
          return false;
        }
        return false;
      }
    },
    [isSupported]
  );

  const downloadFallback = useCallback((url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return {
    isSupported,
    isFileShareSupported,
    share,
    downloadFallback,
  };
}
