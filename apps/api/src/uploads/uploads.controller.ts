import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { UploadsService } from "./uploads.service";
import {
  PresignedUrlRequest,
  CompleteUploadRequest,
} from "@snapdeliver/shared-types";

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
  async initiateMultipartUpload(@Body() body: unknown) {
    const parsed = PresignedUrlRequest.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const { event_id, file_name, file_size, content_type, total_chunks } =
      parsed.data;

    const result = await this.uploadsService.initiateMultipartUpload({
      eventId: event_id,
      fileName: file_name,
      fileSize: file_size,
      contentType: content_type,
      totalChunks: total_chunks,
    });

    return {
      upload_id: result.uploadId,
      urls: result.urls,
      chunk_size: result.chunkSize,
    };
  }

  /**
   * Complete a multipart upload after all parts have been uploaded directly to R2.
   * Creates a Photo record and dispatches a processing job.
   */
  @Post("complete")
  @HttpCode(HttpStatus.OK)
  async completeMultipartUpload(@Body() body: unknown) {
    const parsed = CompleteUploadRequest.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const { upload_id, event_id, parts } = parsed.data;

    const result = await this.uploadsService.completeMultipartUpload({
      uploadId: upload_id,
      eventId: event_id,
      parts,
    });

    return {
      success: true,
      photo_id: result.photoId,
      job_id: result.jobId,
    };
  }

  /**
   * Abort a multipart upload, cleaning up any uploaded parts.
   */
  @Post("abort")
  @HttpCode(HttpStatus.OK)
  async abortMultipartUpload(@Body() body: { upload_id?: string }) {
    if (!body.upload_id || typeof body.upload_id !== "string") {
      throw new BadRequestException("upload_id is required");
    }

    await this.uploadsService.abortMultipartUpload(body.upload_id);
    return { success: true };
  }
}
