"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SelfieCapture } from "@/components/portal/SelfieCapture";
import { canvasToBlob, searchByFace } from "@/lib/face-search";
import { Button } from "@/components/ui/Button";

export default function SelfiePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (canvas: HTMLCanvasElement) => {
    setSearching(true);
    setError(null);

    try {
      const blob = await canvasToBlob(canvas);
      const results = await searchByFace(blob, { eventId });

      // Store results in sessionStorage for the results page
      sessionStorage.setItem(
        `face-results-${eventId}`,
        JSON.stringify(results)
      );

      router.push(`/${eventId}/results`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Search failed. Please try again.";
      setError(message);
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-gray-900">Take a Selfie</h1>
        <p className="text-sm text-gray-500">
          Position your face in the circle and take a photo
        </p>
      </div>

      {error && (
        <div className="w-full rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setError(null)}
          >
            Try Again
          </Button>
        </div>
      )}

      {searching ? (
        <div className="flex flex-col items-center space-y-4 py-12">
          <svg
            className="animate-spin h-12 w-12 text-brand-600"
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
          <p className="text-sm text-gray-600 font-medium">
            Searching for your photos...
          </p>
          <p className="text-xs text-gray-400">
            This may take a few seconds
          </p>
        </div>
      ) : (
        <SelfieCapture onCapture={handleCapture} />
      )}
    </div>
  );
}
