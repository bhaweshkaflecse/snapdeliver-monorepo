import { z } from "zod";
import { UUID } from "./common.schema";

/**
 * Request schema for generating presigned upload URLs
 */
export const PresignedUrlRequest = z.object({
  event_id: UUID,
  file_name: z.string().min(1).max(255),
  file_size: z.number().int().positive(),
  content_type: z.string().min(1),
  total_chunks: z.number().int().min(1).default(1),
});

export type PresignedUrlRequest = z.infer<typeof PresignedUrlRequest>;

/**
 * Response schema containing presigned URLs for upload
 */
export const PresignedUrlResponse = z.object({
  upload_id: z.string().min(1),
  urls: z.array(z.string().url()),
  chunk_size: z.number().int().positive(),
});

export type PresignedUrlResponse = z.infer<typeof PresignedUrlResponse>;

/**
 * Request schema to mark an upload as complete
 */
export const CompleteUploadRequest = z.object({
  upload_id: z.string().min(1),
  event_id: UUID,
  parts: z.array(
    z.object({
      part_number: z.number().int().min(1),
      etag: z.string().min(1),
    })
  ),
});

export type CompleteUploadRequest = z.infer<typeof CompleteUploadRequest>;
