"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PhotoGrid } from "@/components/portal/PhotoGrid";
import { Button } from "@/components/ui/Button";
import type { FaceSearchResultData } from "@/lib/api-client";

export default function ResultsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [results, setResults] = useState<FaceSearchResultData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load results from sessionStorage
    const stored = sessionStorage.getItem(`face-results-${eventId}`);
    if (stored) {
      try {
        setResults(JSON.parse(stored));
      } catch {
        setResults([]);
      }
    }
    setLoaded(true);
  }, [eventId]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg
          className="animate-spin h-8 w-8 text-brand-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-gray-900">Your Photos</h1>
        <p className="text-sm text-gray-500">
          {results.length > 0
            ? `Found ${results.length} photo${results.length === 1 ? "" : "s"} of you`
            : "No matching photos found"}
        </p>
      </div>

      <PhotoGrid photos={results} eventId={eventId} />

      <div className="flex flex-col items-center gap-3 pt-4">
        <Link href={`/${eventId}/selfie`} className="w-full max-w-xs">
          <Button variant="outline" className="w-full">
            Try Another Selfie
          </Button>
        </Link>
      </div>
    </div>
  );
}
