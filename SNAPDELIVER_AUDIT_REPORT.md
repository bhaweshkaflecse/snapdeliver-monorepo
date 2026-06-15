# SnapDeliver System Audit Report

Generated from source analysis of the SnapDeliver monorepo.

---

## Table of Contents

1. [Environment Variable Map](#1-environment-variable-map)
2. [API Bottleneck Check](#2-api-bottleneck-check)
3. [Upload Flow Verification](#3-upload-flow-verification)
4. [Vector Search Check](#4-vector-search-check)
5. [Architecture Diagram](#5-architecture-diagram)
6. [Nepal Market Optimizations](#6-nepal-market-optimizations)

---

## 1. Environment Variable Map

Complete checklist of every environment variable defined in `.env.example`, with descriptions and which services consume each.

| Variable | Description | Services |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | API, Worker, Web |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key for client-side access | Web |
| `SUPABASE_SERVICE_KEY` | Supabase service role key for server-side operations | API, Worker |
| `DATABASE_URL` | PostgreSQL connection string (with pgvector extension) | API, Worker |
| `R2_ACCOUNT_ID` | Cloudflare R2 account identifier | API, Worker |
| `R2_ACCESS_KEY_ID` | R2 access key ID for API authentication | API, Worker |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key for API authentication | API, Worker |
| `R2_BUCKET_NAME` | R2 bucket name for photo storage | API, Worker |
| `R2_PUBLIC_URL` | Public URL prefix for R2 bucket (custom domain or R2.dev) | API, Web |
| `REDIS_URL` | Full Redis connection URL (redis://user:pass@host:port) | API, Worker |
| `REDIS_HOST` | Redis host (used by some services individually) | API, Worker |
| `REDIS_PORT` | Redis port (default: 6379) | API, Worker |
| `NEXT_PUBLIC_API_URL` | API base URL for client requests | Web, Desktop |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for client-side auth | Web |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key for client-side auth | Web |
| `WATERMARK_TEXT` | Default watermark text applied to preview images | Worker |
| `INSIGHTFACE_MODEL_PATH` | Path to InsightFace model files for face recognition | Worker |
| `NODE_ENV` | Node environment (development, production, test) | API, Worker, Web |
| `API_PORT` | Port for the API server (default: 3000) | API |
| `WORKER_PORT` | Port for the worker health check server (default: 3002) | Worker |
| `WEB_PORT` | Port for the web application (default: 3001) | Web |
| `LOG_LEVEL` | Log level (debug, info, warn, error) | API, Worker |
| `JWT_SECRET` | JWT secret for API token signing | API |

**Total: 23 environment variables**

---

## 2. API Bottleneck Check

### Verdict: PASS - No image processing on API main thread

The NestJS API server acts exclusively as a job dispatcher and presigned URL generator. It never processes raw image bytes, never runs InsightFace, and never performs Sharp operations.

### Evidence

**File: `apps/api/src/jobs/jobs.service.ts`**

The `JobsService` class has a single method `dispatchPhotoProcessing()` that:
- Adds a job to the `photo-processing` BullMQ queue via `this.photoProcessingQueue.add()`
- Configures retry policy (3 attempts with exponential backoff at 5s base)
- Returns the job ID
- Does NOT import Sharp, InsightFace, or any image processing library

Key comment from source:
> "IMPORTANT: This service ONLY dispatches jobs to BullMQ. It does NOT process images. All image processing happens in the separate worker microservice (apps/worker)."

**File: `apps/api/src/uploads/uploads.service.ts`**

The `UploadsService` class:
- Generates presigned URLs for multipart uploads via `@aws-sdk/s3-request-presigner`
- Calls `CreateMultipartUploadCommand`, `UploadPartCommand` (for presigning), and `CompleteMultipartUploadCommand`
- Never receives file bytes from the client
- Never processes or transforms image data

**File: `apps/worker/src/processing/processing.processor.ts`**

The `ProcessingProcessor` class (separate microservice) handles ALL heavy work:
- Downloads originals from R2
- Extracts EXIF metadata
- Runs color analysis (Sharp pixel sampling)
- Applies Sharp transformations (gamma, brightness, contrast, saturation, tint)
- Applies watermarks
- Generates thumbnail and social HD sizes
- Extracts face embeddings (InsightFace)
- Uploads processed assets back to R2

### Summary

| Concern | API (main thread) | Worker (separate process) |
|---------|-------------------|---------------------------|
| Image processing (Sharp) | No | Yes |
| Face recognition (InsightFace) | No | Yes |
| Watermark application | No | Yes |
| Presigned URL generation | Yes | No |
| Job dispatch to BullMQ | Yes | No |
| Job consumption from BullMQ | No | Yes |

---

## 3. Upload Flow Verification

### Flow: Desktop -> API (presigned URLs) -> Direct R2 Upload

The upload architecture ensures **zero image bytes flow through the API server**. The API only generates presigned URLs; actual binary data goes directly from the Tauri desktop client to Cloudflare R2.

### Step-by-Step Flow

```
Step 1: File Splitting (Desktop)
  Location: apps/desktop/src/lib/chunked-uploader.ts
  Action:  splitIntoChunks() splits file into 5MB Blob segments
  Const:   CHUNK_SIZE = 5 * 1024 * 1024 (5MB)

Step 2: Request Presigned URLs (Desktop -> API)
  Location: apps/desktop/src/lib/chunked-uploader.ts -> getPresignedUrls()
  Action:  POST to ${endpoint}/uploads/multipart with metadata
  Payload: { event_id, file_name, file_size, content_type, total_chunks }
  Returns: { upload_id, urls[], chunk_size }

Step 3: API Generates Presigned URLs (API)
  Location: apps/api/src/uploads/uploads.service.ts -> initiateMultipartUpload()
  Action:  CreateMultipartUploadCommand then UploadPartCommand per chunk
  Signing: getSignedUrl() with expiresIn: 3600 (1 hour)
  Key:     events/${eventId}/originals/${timestamp}-${fileName}

Step 4: Direct Upload to R2 (Desktop -> R2)
  Location: apps/desktop/src/lib/chunked-uploader.ts -> uploadChunk()
  Action:  PUT request directly to presigned URL with chunk body
  Retry:   Exponential backoff (BASE_DELAY_MS=1000, MAX_RETRIES=5)
  Returns: ETag from R2 response headers

Step 5: Complete Multipart Upload (Desktop -> API -> R2)
  Location: apps/desktop/src/lib/chunked-uploader.ts -> completeUpload()
  Action:  POST to ${endpoint}/uploads/complete with parts array
  API:     UploadsService.completeMultipartUpload() sends
           CompleteMultipartUploadCommand to R2

Step 6: Job Dispatch (API)
  Location: apps/api/src/jobs/jobs.service.ts -> dispatchPhotoProcessing()
  Action:  Adds job to BullMQ 'photo-processing' queue
  Worker:  Picks up job asynchronously for processing
```

### Key Design Decisions

- **No bytes through API**: The API only creates presigned URLs using the AWS SDK. Image data travels directly from client to R2.
- **5MB chunk size**: Matches both client (`chunked-uploader.ts`) and server (`uploads.service.ts`) constants.
- **Retry with backoff**: Client retries failed chunks up to 5 times with exponential backoff + jitter.
- **Abort support**: AbortController integration allows cancellation mid-upload, which triggers `AbortMultipartUploadCommand` on R2.

---

## 4. Vector Search Check

### Verdict: PASS - pgvector properly configured with cosine similarity

### pgvector Extension

**File: `packages/database/prisma/migrations/00001_init/migration.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The pgvector extension is enabled as the first statement in the initial migration.

### vector(512) Column

**File: `packages/database/prisma/migrations/00001_init/migration.sql`**

```sql
CREATE TABLE "face_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "photo_id" UUID NOT NULL,
    "embedding" vector(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "face_embeddings_pkey" PRIMARY KEY ("id")
);
```

The `embedding` column uses `vector(512)` type, matching InsightFace's 512-dimensional face embedding output.

### IVFFlat Index

**File: `packages/database/prisma/migrations/00001_init/migration.sql`**

```sql
CREATE INDEX "face_embeddings_embedding_idx" ON "face_embeddings"
USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
```

An IVFFlat index with `vector_cosine_ops` operator class accelerates cosine similarity queries. Configured with 100 lists for balanced recall/speed.

### search_wedding_photos RPC Function

**File: `packages/database/prisma/migrations/00002_search_function/migration.sql`**

```sql
CREATE OR REPLACE FUNCTION search_wedding_photos(
    query_embedding vector(512),
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 10,
    target_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    photo_id UUID,
    event_id UUID,
    original_key TEXT,
    social_key TEXT,
    thumbnail_key TEXT,
    metadata_json JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fe.id,
        fe.photo_id,
        p.event_id,
        p.original_key,
        p.social_key,
        p.thumbnail_key,
        p.metadata_json,
        1 - (fe.embedding <=> query_embedding) AS similarity
    FROM face_embeddings fe
    INNER JOIN photos p ON p.id = fe.photo_id
    WHERE 1 - (fe.embedding <=> query_embedding) > match_threshold
        AND (target_event_id IS NULL OR p.event_id = target_event_id)
    ORDER BY fe.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
```

### Cosine Similarity Operator

The `<=>` operator computes cosine distance between vectors. The function converts to similarity via `1 - distance`:
- `1 - (fe.embedding <=> query_embedding) AS similarity` - returns similarity score
- `WHERE 1 - (fe.embedding <=> query_embedding) > match_threshold` - filters by threshold (default 0.8)
- `ORDER BY fe.embedding <=> query_embedding ASC` - nearest vectors first

### Parameters

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `query_embedding` | vector(512) | required | Face embedding to search for |
| `match_threshold` | float | 0.8 | Minimum similarity (0-1) |
| `match_count` | int | 10 | Max results returned |
| `target_event_id` | UUID | NULL | Optional event filter |

---

## 5. Architecture Diagram

```
+-------------------------------------------------------------------+
|                        CLIENT TIER                                  |
+-------------------------------------------------------------------+

  +---------------------------+       +---------------------------+
  |   Tauri Desktop App       |       |   Next.js Web Portal      |
  |   (apps/desktop)          |       |   (apps/web)              |
  |                           |       |                           |
  |  +-------------------+    |       |  +-------------------+    |
  |  | Chunked Uploader  |    |       |  | Guest Portal      |    |
  |  | (5MB chunks)      |    |       |  | (Face Search)     |    |
  |  +--------+----------+    |       |  +--------+----------+    |
  |           |               |       |           |               |
  |  +--------+----------+    |       |  +--------+----------+    |
  |  | Offline Queue      |    |       |  | ShareButton       |    |
  |  | (IndexedDB)        |    |       |  | (navigator.share) |    |
  |  +--------+----------+    |       |  +--------+----------+    |
  +-----------|---------------+       +-----------|---------------+
              |                                   |
              | (1) POST /uploads/multipart        | (6) GET /photos/search
              | (metadata only, no bytes)          | (face embedding query)
              |                                   |
+-------------|-----------------------------------|-----------------+
|             v                                   v                  |
|   +-----------------------------------------------------------+   |
|   |              NestJS API Server (apps/api)                  |   |
|   |                                                           |   |
|   |  UploadsService          JobsService        PhotosService |   |
|   |  - Presigned URL gen     - BullMQ dispatch  - Search      |   |
|   |  - No byte processing    - No processing   - Results      |   |
|   +-----+----------------------------+-------------------+----+   |
|         |                            |                   |        |
|         | (2) Presigned URLs         | (4) Add job       |        |
|         |     returned to client     |                   |        |
|         |                            v                   |        |
|   SERVER TIER                 +---------------+          |        |
|                               |   Redis       |          |        |
|                               |   (BullMQ)    |          |        |
|                               +-------+-------+          |        |
|                                       |                  |        |
|                                       | (5) Consume job  |        |
|                                       v                  |        |
|   +-----------------------------------------------------------+   |
|   |            Worker Microservice (apps/worker)               |   |
|   |                                                           |   |
|   |  ProcessingProcessor:                                     |   |
|   |  1. Download original from R2                             |   |
|   |  2. EXIF extraction                                       |   |
|   |  3. Color analysis (green/magenta cast detection)         |   |
|   |  4. Preset selection + color override logic               |   |
|   |  5. Sharp processing (gamma, brightness, contrast, etc.)  |   |
|   |  6. Watermark application                                 |   |
|   |  7. Thumbnail + Social HD generation                      |   |
|   |  8. Face embedding extraction (InsightFace)               |   |
|   |  9. Upload processed assets to R2                         |   |
|   +-----+--------------------------------------+--------------+   |
|         |                                      |                  |
+---------|-----------------+--------------------+------------------+
          |                 |                    |
          v                 v                    v
+-------------------------------------------------------------------+
|                       STORAGE TIER                                  |
+-------------------------------------------------------------------+

  +---------------------------+       +---------------------------+
  |   Cloudflare R2           |       |   PostgreSQL + pgvector   |
  |   (S3-compatible)         |       |   (via Supabase)          |
  |                           |       |                           |
  |  /events/{id}/originals/  |       |  events table             |
  |  /events/{id}/thumbnails/ |       |  photos table             |
  |  /events/{id}/social/     |       |  face_embeddings table    |
  |                           |       |    - vector(512) column   |
  +---------------------------+       |    - IVFFlat index         |
         ^                            |    - search_wedding_photos |
         |                            +---------------------------+
         | (3) Direct PUT upload
         |     (chunks via presigned URL)
         |
    [Desktop Client]
```

### Data Flow Summary

1. Desktop client requests presigned URLs from API (metadata only)
2. API returns signed URLs (no bytes processed)
3. Desktop uploads 5MB chunks directly to R2 via presigned URLs
4. API dispatches processing job to Redis/BullMQ queue
5. Worker consumes job, processes image (Sharp + InsightFace)
6. Web portal queries photos via face embedding similarity search

---

## 6. Nepal Market Optimizations

### 6.1 Offline-First Upload Queue

**File: `apps/desktop/src/lib/offline-queue.ts`**

Nepal's internet connectivity is unreliable (frequent dropouts, slow speeds, load shedding). The offline queue provides resilience:

- **IndexedDB Persistence**: Queue state survives app restarts. Pending uploads are stored in IndexedDB (`snapdeliver-upload-queue` database).
- **Network Monitoring**: Subscribes to `networkMonitor` for online/offline state changes. Automatically pauses on disconnect and resumes on reconnect.
- **Auto-Resume**: When connectivity returns, the queue automatically processes pending items without user intervention.
- **Pause/Resume/Retry**: Manual controls for user override. Failed uploads can be bulk-retried via `retryFailed()`.
- **Status Tracking**: Each item tracks status (`pending`, `uploading`, `paused`, `completed`, `failed`), progress percentage, chunks completed, and upload speed.
- **Abort Support**: In-progress uploads can be cancelled via AbortController, triggering R2 multipart abort cleanup.

### 6.2 Color Neutralization for Party Palaces

**File: `apps/worker/src/processing/services/color-analysis.service.ts`**

Nepal wedding venues ("party palaces") use decorative lighting that creates extreme color casts in photos:

- **Green Cast Detection**: Fluorescent/LED tubes cause green dominance. Triggered when green channel exceeds red by 1.3x ratio (`GREEN_CAST_RATIO = 1.3`).
- **Magenta Cast Detection**: Decorative lighting creates magenta shift. Triggered when average of R+B exceeds green by 1.4x ratio (`MAGENTA_CAST_RATIO = 1.4`).
- **Performance Sampling**: Analyzes a downsampled 128x128 pixel version for fast channel averaging.
- **Automatic Override**: When cast is detected, `shouldOverridePreset` triggers switch to the "Color Neutralize" preset, overriding the EXIF-based preset selection.

**Processing Pipeline Integration** (from `processing.processor.ts`):
```
Step 3: Select preset from EXIF data
Step 4: Analyze color channels for cast detection
Step 5: IF shouldOverridePreset -> switch to Color Neutralize preset
Step 6: Apply Sharp operations with final preset
```

### 6.3 Mobile-First Portal with Native Share

**File: `apps/web/src/components/portal/ShareButton.tsx`**

Nepal's primary photo sharing happens via mobile (WhatsApp, Instagram). The guest portal is optimized for this:

- **Navigator.share() API**: Uses the Web Share API for native sharing on mobile devices, enabling direct sharing to WhatsApp, Instagram, Facebook, Viber, and other installed apps.
- **Graceful Fallback**: When Web Share API is unavailable (desktop browsers), falls back to direct file download.
- **Error Recovery**: If native share fails (user cancels, permission denied), automatically falls back to download.
- **Analytics Tracking**: Share and download actions are tracked via `apiClient.track.share()` and `apiClient.track.download()` for photographer insights.
- **Mobile-Optimized UI**: Compact pill-shaped button with backdrop blur, suitable for overlay on photo thumbnails.

### Nepal-Specific Architecture Decisions

| Challenge | Solution | Location |
|-----------|----------|----------|
| Unreliable internet | Offline queue with IndexedDB + auto-resume | `apps/desktop/src/lib/offline-queue.ts` |
| Party palace lighting | Color cast detection + neutralize override | `apps/worker/src/processing/services/color-analysis.service.ts` |
| Mobile-first sharing | navigator.share() with download fallback | `apps/web/src/components/portal/ShareButton.tsx` |
| Low bandwidth | 5MB chunked uploads with retry | `apps/desktop/src/lib/chunked-uploader.ts` |
| Load shedding | Persistent queue survives app restart | `apps/desktop/src/lib/offline-queue.ts` (IndexedDB) |

---

*End of audit report.*
