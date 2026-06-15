import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { UploadsService } from "./uploads.service";

class PresignedUrlRequestDto {
  event_id!: string;
  file_name!: string;
  file_size!: number;
  content_type!: string;
  total_chunks!: number;
}

class CompleteUploadRequestDto {
  upload_id!: string;
  event_id!: string;
  parts!: { part_number: number; etag: string }[];
}

class AbortUploadRequestDto {
  upload_id!: string;
}

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Generate presigned URLs for multipart upload.
   * This endpoint NEVER processes raw image bytes - it only returns
   * presigned URLs that clients use to upload directly to R2.
   */
  @Post("multipart")
  @HttpCode(HttpStatus.OK)
  async initiateMultipartUpload(@Body() body: PresignedUrlRequestDto) {
    const result = await this.uploadsService.initiateMultipartUpload({
      eventId: body.event_id,
      fileName: body.file_name,
      fileSize: body.file_size,
      contentType: body.content_type,
      totalChunks: body.total_chunks,
    });

    return {
      upload_id: result.uploadId,
      urls: result.urls,
      chunk_size: result.chunkSize,
    };
  }

  /**
   * Complete a multipart upload after all parts have been uploaded directly to R2.
   */
  @Post("complete")
  @HttpCode(HttpStatus.OK)
  async completeMultipartUpload(@Body() body: CompleteUploadRequestDto) {
    await this.uploadsService.completeMultipartUpload({
      uploadId: body.upload_id,
      eventId: body.event_id,
      parts: body.parts,
    });

    return { success: true };
  }

  /**
   * Abort a multipart upload, cleaning up any uploaded parts.
   */
  @Post("abort")
  @HttpCode(HttpStatus.OK)
  async abortMultipartUpload(@Body() body: AbortUploadRequestDto) {
    await this.uploadsService.abortMultipartUpload(body.upload_id);
    return { success: true };
  }
}
