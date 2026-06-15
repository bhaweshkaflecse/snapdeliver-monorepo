"use client";

import type { FaceSearchResultData } from "@/lib/api-client";
import { ShareButton } from "./ShareButton";

interface PhotoGridProps {
  photos: FaceSearchResultData[];
  eventId: string;
}

export function PhotoGrid({ photos, eventId }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="h-16 w-16 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5"
          />
        </svg>
        <p className="text-gray-500">No matching photos found.</p>
        <p className="text-sm text-gray-400 mt-1">
          Try taking another selfie with better lighting.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => {
        const imageUrl = photo.social_key || photo.original_key;
        return (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
          >
            <img
              src={imageUrl}
              alt="Matched photo"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ShareButton
                photoUrl={imageUrl}
                photoId={photo.photo_id}
                eventId={eventId}
              />
            </div>
            <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5">
              <span className="text-xs text-white font-medium">
                {Math.round(photo.similarity * 100)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
