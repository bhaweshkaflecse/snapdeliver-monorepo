import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export interface UploadResult {
  key: string;
  size: number;
}

/**
 * Handles uploads of processed assets to R2/S3.
 * Generates structured key paths for organized storage.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>("R2_ACCOUNT_ID") || "";
    const accessKeyId =
      this.configService.get<string>("R2_ACCESS_KEY_ID") || "";
    const secretAccessKey =
      this.configService.get<string>("R2_SECRET_ACCESS_KEY") || "";
    this.bucketName = this.configService.get<string>("R2_BUCKET_NAME") || "";

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Downloads the original image from R2 for processing.
   */
  async downloadOriginal(key: string): Promise<Buffer> {
    this.logger.debug(`Downloading original: ${key}`);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Empty response body for key: ${key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Uploads the thumbnail to the structured path:
   * events/{event_id}/thumbnails/{photo_id}.jpg
   */
  async uploadThumbnail(
    eventId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<UploadResult> {
    const key = `events/${eventId}/thumbnails/${photoId}.jpg`;
    await this.upload(key, buffer, "image/jpeg");
    return { key, size: buffer.length };
  }

  /**
   * Uploads the social HD version to the structured path:
   * events/{event_id}/social/{photo_id}.jpg
   */
  async uploadSocialHd(
    eventId: string,
    photoId: string,
    buffer: Buffer
  ): Promise<UploadResult> {
    const key = `events/${eventId}/social/${photoId}.jpg`;
    await this.upload(key, buffer, "image/jpeg");
    return { key, size: buffer.length };
  }

  /**
   * Uploads a buffer to R2 with the given key and content type.
   */
  private async upload(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    this.logger.debug(
      `Uploaded: ${key} (${(buffer.length / 1024).toFixed(1)}KB)`
    );
  }
}
