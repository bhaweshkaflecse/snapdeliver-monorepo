/**
 * Chunked uploader - splits files into 5MB chunks,
 * requests presigned URLs from the API, and uploads
 * each chunk directly to R2 via the presigned URL.
 * Includes retry with exponential backoff.
 */

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export interface ChunkUploadProgress {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  bytesUploaded: number;
  totalBytes: number;
  speed: number;
}

export interface UploadResult {
  success: boolean;
  uploadId?: string;
  error?: string;
}

export type ProgressCallback = (progress: ChunkUploadProgress) => void;

function getApiEndpoint(): string {
  return localStorage.getItem("api_endpoint") || "/api";
}

/**
 * Splits a file into 5MB chunks.
 */
export function splitIntoChunks(file: File): Blob[] {
  const chunks: Blob[] = [];
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    chunks.push(file.slice(offset, end));
    offset = end;
  }
  return chunks;
}

/**
 * Initiates a multipart upload and gets presigned URLs from the API.
 */
async function getPresignedUrls(
  eventId: string,
  fileName: string,
  fileSize: number,
  contentType: string,
  totalChunks: number
): Promise<{ upload_id: string; urls: string[]; chunk_size: number }> {
  const endpoint = getApiEndpoint();
  const response = await fetch(`${endpoint}/uploads/multipart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: eventId,
      file_name: fileName,
      file_size: fileSize,
      content_type: contentType,
      total_chunks: totalChunks,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get presigned URLs: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Uploads a single chunk to R2 via presigned URL with retry.
 */
async function uploadChunk(
  url: string,
  chunk: Blob,
  retryCount: number = 0
): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "PUT",
      body: chunk,
      headers: {
        "Content-Length": chunk.size.toString(),
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    // Get ETag from response headers
    const etag = response.headers.get("ETag") || "";
    return etag;
  } catch (error) {
    if (retryCount >= MAX_RETRIES) {
      throw error;
    }

    // Exponential backoff with jitter
    const delay =
      BASE_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return uploadChunk(url, chunk, retryCount + 1);
  }
}

/**
 * Completes a multipart upload after all parts are uploaded.
 */
async function completeUpload(
  uploadId: string,
  eventId: string,
  parts: { part_number: number; etag: string }[]
): Promise<void> {
  const endpoint = getApiEndpoint();
  const response = await fetch(`${endpoint}/uploads/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_id: uploadId,
      event_id: eventId,
      parts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to complete upload: ${response.status}`);
  }
}

/**
 * Aborts a multipart upload.
 */
async function abortUpload(uploadId: string): Promise<void> {
  const endpoint = getApiEndpoint();
  await fetch(`${endpoint}/uploads/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId }),
  });
}

/**
 * Main upload function - orchestrates the entire chunked upload flow.
 * Splits the file into 5MB chunks, gets presigned URLs from the API,
 * then uploads each chunk directly to R2.
 */
export async function uploadFile(
  file: File,
  eventId: string,
  fileId: string,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<UploadResult> {
  const chunks = splitIntoChunks(file);
  const totalChunks = chunks.length;

  let uploadId: string | undefined;
  let startTime = Date.now();
  let totalBytesUploaded = 0;

  try {
    // Step 1: Get presigned URLs from the API
    const { upload_id, urls } = await getPresignedUrls(
      eventId,
      file.name,
      file.size,
      file.type || "application/octet-stream",
      totalChunks
    );
    uploadId = upload_id;

    // Step 2: Upload each chunk directly to R2
    const parts: { part_number: number; etag: string }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (abortSignal?.aborted) {
        await abortUpload(uploadId);
        return { success: false, error: "Upload aborted" };
      }

      const chunk = chunks[i];
      const etag = await uploadChunk(urls[i], chunk);

      parts.push({ part_number: i + 1, etag });
      totalBytesUploaded += chunk.size;

      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? totalBytesUploaded / elapsed : 0;

      onProgress({
        fileId,
        chunkIndex: i + 1,
        totalChunks,
        bytesUploaded: totalBytesUploaded,
        totalBytes: file.size,
        speed,
      });
    }

    // Step 3: Complete the multipart upload
    await completeUpload(uploadId, eventId, parts);

    return { success: true, uploadId };
  } catch (error) {
    // Attempt to abort on failure
    if (uploadId) {
      try {
        await abortUpload(uploadId);
      } catch {
        // Ignore abort failures
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
