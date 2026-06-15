import { Injectable } from "@nestjs/common";
import { prisma } from "@snapdeliver/database";

interface FaceSearchParams {
  embedding: number[];
  eventId?: string;
  matchThreshold: number;
  matchCount: number;
}

@Injectable()
export class PhotosService {
  async findAll(eventId?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = eventId ? { event_id: eventId } : {};

    const [items, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.photo.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return prisma.photo.findUnique({
      where: { id },
    });
  }

  /**
   * Searches for photos by face similarity using the search_wedding_photos
   * database function (pgvector cosine similarity search).
   */
  async searchByFace(params: FaceSearchParams) {
    const { embedding, eventId, matchThreshold, matchCount } = params;

    // Call the search_wedding_photos RPC function defined in the database migration
    const embeddingStr = `[${embedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<
      {
        id: string;
        photo_id: string;
        event_id: string;
        original_key: string;
        social_key: string | null;
        thumbnail_key: string | null;
        metadata_json: unknown;
        similarity: number;
      }[]
    >(
      `SELECT * FROM search_wedding_photos($1::vector, $2, $3, $4)`,
      embeddingStr,
      eventId || null,
      matchThreshold,
      matchCount
    );

    return results;
  }
}
