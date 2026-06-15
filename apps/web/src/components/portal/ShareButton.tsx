"use client";

import { useCallback, useState } from "react";
import { useShare } from "@/hooks/useShare";
import { apiClient } from "@/lib/api-client";

interface ShareButtonProps {
  photoUrl: string;
  photoId: string;
  eventId: string;
}

/**
 * ShareButton implements navigator.share() for native sharing
 * to Instagram, WhatsApp, and other apps. Falls back to download
 * when the Web Share API is not available.
 */
export function ShareButton({ photoUrl, photoId, eventId }: ShareButtonProps) {
  const { isSupported, share, downloadFallback } = useShare();
  const [loading, setLoading] = useState(false);

  const handleShare = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupported) {
        // Use navigator.share() for native sharing
        const shared = await share({
          title: "Check out my event photo!",
          text: "Found my photo from the event via SnapDeliver",
          url: photoUrl,
        });

        if (shared) {
          // Track the share action
          await apiClient.track.share(eventId, photoId);
        }
      } else {
        // Fallback: download the photo
        downloadFallback(photoUrl, `snapdeliver-photo-${photoId}.jpg`);
        await apiClient.track.download(eventId, photoId);
      }
    } catch {
      // If share fails, fall back to download
      downloadFallback(photoUrl, `snapdeliver-photo-${photoId}.jpg`);
      await apiClient.track.download(eventId, photoId);
    } finally {
      setLoading(false);
    }
  }, [isSupported, share, downloadFallback, photoUrl, photoId, eventId]);

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm hover:bg-white transition-colors disabled:opacity-50"
      aria-label={isSupported ? "Share photo" : "Download photo"}
    >
      {loading ? (
        <svg
          className="animate-spin h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : isSupported ? (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      {isSupported ? "Share" : "Download"}
    </button>
  );
}
