import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ProcessPhotoJobPayload } from "./dto/process-photo.dto";
import { ExifService } from "./services/exif.service";
import { PresetService, SharpPresetOps } from "./services/preset.service";
import { ColorAnalysisService } from "./services/color-analysis.service";
import { WatermarkService } from "./services/watermark.service";
import { ResizeService } from "./services/resize.service";
import { FaceExtractionService } from "./services/face-extraction.service";
import { StorageService } from "./services/storage.service";
import { prisma } from "@snapdeliver/database";
import * as sharp from "sharp";

/**
 * BullMQ processor for the 'photo-processing' queue.
 *
 * Orchestrates the full image processing pipeline:
 * 1. Download original from R2
 * 2. Extract EXIF metadata
 * 3. Select preset based on EXIF
 * 4. Analyze color channels for cast detection
 * 5. Override preset if extreme color cast detected
 * 6. Apply Sharp processing (brightness, contrast, saturation, gamma, tint)
 * 7. Apply watermark
 * 8. Generate thumbnail and social HD sizes
 * 9. Extract face embeddings
 * 10. Upload processed assets back to R2
 */
@Processor("photo-processing")
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);

  constructor(
    private readonly exifService: ExifService,
    private readonly presetService: PresetService,
    private readonly colorAnalysisService: ColorAnalysisService,
    private readonly watermarkService: WatermarkService,
    private readonly resizeService: ResizeService,
    private readonly faceExtractionService: FaceExtractionService,
    private readonly storageService: StorageService
  ) {
    super();
  }

  async process(job: Job<ProcessPhotoJobPayload>): Promise<void> {
    const { eventId, photoId, photoKey, photographerId, watermarkConfig } =
      job.data;

    this.logger.log(
      `Processing photo ${photoId} for event ${eventId} (key: ${photoKey})`
    );

    try {
      // Step 1: Download original image from R2
      await job.updateProgress(5);
      const originalBuffer = await this.storageService.downloadOriginal(
        photoKey
      );
      this.logger.debug(
        `Downloaded original: ${(originalBuffer.length / (1024 * 1024)).toFixed(2)}MB`
      );

      // Step 2: Extract EXIF metadata
      await job.updateProgress(10);
      const exifData = await this.exifService.extractExif(originalBuffer);
      this.logger.debug(`EXIF: ISO=${exifData.iso}, Flash=${exifData.flash}, WB=${exifData.whiteBalance}`);

      // Step 3: Select preset based on EXIF data
      await job.updateProgress(15);
      let selectedPreset = this.presetService.selectPresetFromExif(exifData);
      this.logger.log(`Initial preset selection: ${selectedPreset.name}`);

      // Step 4: Analyze color channels for cast detection
      await job.updateProgress(20);
      const colorAnalysis =
        await this.colorAnalysisService.analyzeColorCast(originalBuffer);

      // Step 5: Override preset if extreme color cast detected
      if (colorAnalysis.shouldOverridePreset) {
        selectedPreset = this.presetService.getColorNeutralizePreset();
        this.logger.warn(
          `Color cast override: switching to "${selectedPreset.name}" preset`
        );
      }

      // Step 6: Apply Sharp processing with selected preset
      await job.updateProgress(30);
      const processedBuffer = await this.applyPresetOperations(
        originalBuffer,
        selectedPreset.ops
      );
      this.logger.debug("Sharp processing complete");

      // Step 7: Apply watermark
      await job.updateProgress(50);
      const watermarkedBuffer = await this.watermarkService.applyWatermark(
        processedBuffer,
        watermarkConfig
      );

      // Step 8: Generate thumbnail and social HD sizes
      await job.updateProgress(60);
      const { thumbnail, socialHd } =
        await this.resizeService.generateSizes(watermarkedBuffer);

      // Step 9: Extract face embeddings (non-blocking)
      await job.updateProgress(75);
      const faceEmbeddings =
        await this.faceExtractionService.extractFaces(processedBuffer);
      this.logger.log(`Detected ${faceEmbeddings.length} face(s)`);

      // Step 10: Upload processed assets back to R2
      await job.updateProgress(85);
      const [thumbnailResult, socialHdResult] = await Promise.all([
        this.storageService.uploadThumbnail(eventId, photoId, thumbnail),
        this.storageService.uploadSocialHd(eventId, photoId, socialHd),
      ]);

      await job.updateProgress(100);
      this.logger.log(
        `Photo ${photoId} processing complete. ` +
          `Thumbnail: ${thumbnailResult.key} (${(thumbnailResult.size / 1024).toFixed(1)}KB), ` +
          `Social: ${socialHdResult.key} (${(socialHdResult.size / (1024 * 1024)).toFixed(2)}MB), ` +
          `Faces: ${faceEmbeddings.length}`
      );

      // Persist processed photo keys to the database
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          thumbnail_key: thumbnailResult.key,
          social_key: socialHdResult.key,
          metadata_json: {
            exif: exifData,
            preset: selectedPreset.name,
            colorCastOverride: colorAnalysis.shouldOverridePreset,
            facesDetected: faceEmbeddings.length,
          },
        },
      });

      this.logger.log(`Updated photo ${photoId} with processed keys`);

      // Persist face embeddings to the database
      if (faceEmbeddings.length > 0) {
        for (const face of faceEmbeddings) {
          const embeddingStr = `[${face.embedding.join(",")}]`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO face_embeddings (id, photo_id, embedding, created_at) VALUES (gen_random_uuid(), $1, $2::vector, NOW())`,
            photoId,
            embeddingStr
          );
        }

        this.logger.log(
          `Inserted ${faceEmbeddings.length} face embedding(s) for photo ${photoId}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process photo ${photoId}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error; // Re-throw to trigger BullMQ retry
    }
  }

  /**
   * Applies Sharp operations defined by the selected preset.
   */
  private async applyPresetOperations(
    buffer: Buffer,
    ops: SharpPresetOps
  ): Promise<Buffer> {
    let pipeline = sharp(buffer);

    // Apply gamma correction
    pipeline = pipeline.gamma(ops.gamma);

    // Apply modulate for brightness, saturation adjustments
    pipeline = pipeline.modulate({
      brightness: ops.brightness,
      saturation: ops.saturation,
    });

    // Apply linear contrast adjustment
    if (ops.contrast !== 1.0) {
      pipeline = pipeline.linear(ops.contrast, -(128 * (ops.contrast - 1)));
    }

    // Apply tint correction if any channel adjustment is needed
    if (ops.tint.r !== 0 || ops.tint.g !== 0 || ops.tint.b !== 0) {
      pipeline = pipeline.tint({
        r: 128 + ops.tint.r,
        g: 128 + ops.tint.g,
        b: 128 + ops.tint.b,
      });
    }

    return pipeline.toBuffer();
  }
}
