import { z } from "zod";
import { UUID } from "./common.schema";

/**
 * Schema for photo metadata stored as JSON
 */
export const PhotoMetadata = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.string().optional(),
  size_bytes: z.number().int().positive().optional(),
  exif: z.record(z.unknown()).optional(),
});

export type PhotoMetadata = z.infer<typeof PhotoMetadata>;

/**
 * Schema for photo API response
 */
export const PhotoResponse = z.object({
  id: UUID,
  event_id: UUID,
  original_key: z.string(),
  social_key: z.string().nullable(),
  thumbnail_key: z.string().nullable(),
  metadata_json: PhotoMetadata.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type PhotoResponse = z.infer<typeof PhotoResponse>;

/**
 * Schema for face search request - embedding vector for similarity search
 */
export const FaceSearchRequest = z.object({
  embedding: z.array(z.number()).length(512),
  event_id: UUID.optional(),
  match_threshold: z.number().min(0).max(1).default(0.8),
  match_count: z.number().int().min(1).max(50).default(10),
});

export type FaceSearchRequest = z.infer<typeof FaceSearchRequest>;

/**
 * Schema for individual face search result
 */
export const FaceSearchResult = z.object({
  id: UUID,
  photo_id: UUID,
  event_id: UUID,
  original_key: z.string(),
  social_key: z.string().nullable(),
  thumbnail_key: z.string().nullable(),
  metadata_json: PhotoMetadata.nullable(),
  similarity: z.number().min(0).max(1),
});

export type FaceSearchResult = z.infer<typeof FaceSearchResult>;

/**
 * Schema for face search response
 */
export const FaceSearchResponse = z.object({
  results: z.array(FaceSearchResult),
  count: z.number().int().min(0),
});

export type FaceSearchResponse = z.infer<typeof FaceSearchResponse>;
