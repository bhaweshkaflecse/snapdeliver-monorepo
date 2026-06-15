import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export interface DispatchPhotoProcessingParams {
  eventId: string;
  photoId: string;
  photoKey: string;
  photographerId: string;
  watermarkConfig?: {
    text?: string;
    opacity?: number;
    fontSize?: number;
  };
}

/**
 * Jobs service for the API layer.
 *
 * IMPORTANT: This service ONLY dispatches jobs to BullMQ.
 * It does NOT process images. All image processing happens
 * in the separate worker microservice (apps/worker).
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue("photo-processing")
    private readonly photoProcessingQueue: Queue
  ) {}

  /**
   * Dispatches a photo processing job to the worker queue.
   * Called after upload completion to trigger async processing.
   *
   * The job will be picked up by the worker microservice which handles:
   * - EXIF extraction
   * - Preset selection and color analysis
   * - Sharp image processing
   * - Watermarking
   * - Thumbnail and social HD generation
   * - Face embedding extraction
   * - R2 upload of processed assets
   */
  async dispatchPhotoProcessing(
    params: DispatchPhotoProcessingParams
  ): Promise<string> {
    const job = await this.photoProcessingQueue.add(
      "process-photo",
      {
        eventId: params.eventId,
        photoId: params.photoId,
        photoKey: params.photoKey,
        photographerId: params.photographerId,
        watermarkConfig: params.watermarkConfig,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      }
    );

    this.logger.log(
      `Dispatched photo processing job ${job.id} for photo ${params.photoId} in event ${params.eventId}`
    );

    return job.id || "";
  }
}
