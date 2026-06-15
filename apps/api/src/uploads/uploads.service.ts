import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_CLIENT } from "./r2.provider";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export interface InitiateUploadParams {
  eventId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  totalChunks: number;
}

export interface CompleteUploadParams {
  uploadId: string;
  eventId: string;
  parts: { part_number: number; etag: string }[];
}

@Injectable()
export class UploadsService {
  private readonly bucketName: string;

  constructor(
    @Inject(R2_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService
  ) {
    this.bucketName = this.configService.get<string>("r2.bucketName") || "";
  }

  /**
   * Initiates a multipart upload and returns presigned URLs for each chunk.
   * Does NOT process raw image bytes - only generates presigned URLs.
   */
  async initiateMultipartUpload(params: InitiateUploadParams): Promise<{
    uploadId: string;
    urls: string[];
    chunkSize: number;
  }> {
    const { eventId, fileName, fileSize, contentType, totalChunks } = params;
    const key = `events/${eventId}/originals/${Date.now()}-${fileName}`;

    // Create the multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const { UploadId } = await this.s3Client.send(createCommand);

    if (!UploadId) {
      throw new Error("Failed to initiate multipart upload");
    }

    // Generate presigned URLs for each part
    const urls: string[] = [];
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const uploadPartCommand = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId,
        PartNumber: partNumber,
      });

      const presignedUrl = await getSignedUrl(
        this.s3Client,
        uploadPartCommand,
        { expiresIn: 3600 }
      );

      urls.push(presignedUrl);
    }

    return {
      uploadId: `${UploadId}::${key}`,
      urls,
      chunkSize: CHUNK_SIZE,
    };
  }

  /**
   * Completes a multipart upload after all parts have been uploaded.
   */
  async completeMultipartUpload(params: CompleteUploadParams): Promise<void> {
    const { uploadId, parts } = params;
    const [s3UploadId, key] = uploadId.split("::");

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: s3UploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({
          PartNumber: p.part_number,
          ETag: p.etag,
        })),
      },
    });

    await this.s3Client.send(completeCommand);
  }

  /**
   * Aborts a multipart upload, cleaning up any uploaded parts.
   */
  async abortMultipartUpload(uploadId: string): Promise<void> {
    const [s3UploadId, key] = uploadId.split("::");

    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: s3UploadId,
    });

    await this.s3Client.send(abortCommand);
  }
}
