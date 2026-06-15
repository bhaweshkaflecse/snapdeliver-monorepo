import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { PhotosService } from "./photos.service";

class FaceSearchDto {
  embedding!: number[];
  event_id?: string;
  match_threshold?: number;
  match_count?: number;
}

@Controller("photos")
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get()
  async findAll(
    @Query("event_id") eventId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "20", 10);
    return this.photosService.findAll(eventId, pageNum, limitNum);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const photo = await this.photosService.findOne(id);
    if (!photo) {
      throw new NotFoundException(`Photo with id ${id} not found`);
    }
    return photo;
  }

  /**
   * Face search endpoint - uses the search_wedding_photos RPC
   * to find photos containing similar face embeddings.
   */
  @Post("face-search")
  @HttpCode(HttpStatus.OK)
  async faceSearch(@Body() body: FaceSearchDto) {
    const results = await this.photosService.searchByFace({
      embedding: body.embedding,
      eventId: body.event_id,
      matchThreshold: body.match_threshold ?? 0.8,
      matchCount: body.match_count ?? 10,
    });

    return {
      results,
      count: results.length,
    };
  }
}
