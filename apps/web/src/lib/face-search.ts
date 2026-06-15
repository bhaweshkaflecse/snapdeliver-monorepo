/**
 * Face search utility - sends captured selfie blob to the API
 * for face vector extraction and pgvector similarity search.
 */

import { apiClient, type FaceSearchResultData } from "./api-client";

export interface FaceSearchOptions {
  eventId: string;
  threshold?: number;
}

export interface FaceSearchState {
  loading: boolean;
  results: FaceSearchResultData[];
  error: string | null;
}

/**
 * Sends a selfie blob to the API for embedding extraction,
 * then performs a face similarity search using pgvector.
 */
export async function searchByFace(
  selfieBlob: Blob,
  options: FaceSearchOptions
): Promise<FaceSearchResultData[]> {
  // Step 1: Extract face embedding from the selfie
  const { embedding } = await apiClient.faceSearch.extractEmbedding(selfieBlob);

  // Step 2: Search for matching photos using the embedding
  const response = await apiClient.faceSearch.search(
    embedding,
    options.eventId,
    options.threshold
  );

  if (response.error) {
    throw new Error(response.error);
  }

  return response.data?.results ?? [];
}

/**
 * Converts a canvas element to a Blob for upload
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      type,
      quality
    );
  });
}
