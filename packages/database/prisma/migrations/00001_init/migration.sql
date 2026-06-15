-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('FREE', 'STANDARD', 'PREMIUM');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "pricing_tier" "PricingTier" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "original_key" TEXT NOT NULL,
    "social_key" TEXT,
    "thumbnail_key" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "photo_id" UUID NOT NULL,
    "embedding" vector(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photos_event_id_idx" ON "photos"("event_id");

-- CreateIndex
CREATE INDEX "face_embeddings_photo_id_idx" ON "face_embeddings"("photo_id");

-- CreateIndex (HNSW index for vector similarity search)
CREATE INDEX "face_embeddings_embedding_idx" ON "face_embeddings"
USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- AddForeignKey
ALTER TABLE "photos"
ADD CONSTRAINT "photos_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_embeddings"
ADD CONSTRAINT "face_embeddings_photo_id_fkey"
FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
