import { Injectable, Logger } from "@nestjs/common";
import * as sharp from "sharp";

export interface ResizedOutputs {
  /** Thumbnail: ~200KB max, 400px width, quality 70 */
  thumbnail: Buffer;
  /** Social HD: 1-2MB, 1920px width, quality 85 */
  socialHd: Buffer;
}

@Injectable()
export class ResizeService {
  private readonly logger = new Logger(ResizeService.name);

  /** Thumbnail constraints */
  private readonly THUMBNAIL_WIDTH = 400;
  private readonly THUMBNAIL_QUALITY = 70;
  private readonly THUMBNAIL_MAX_BYTES = 200 * 1024; // 200KB

  /** Social HD constraints */
  private readonly SOCIAL_HD_WIDTH = 1920;
  private readonly SOCIAL_HD_QUALITY = 85;

  /**
   * Generates both thumbnail and social HD versions from the processed image.
   * Both outputs are JPEG format.
   */
  async generateSizes(imageBuffer: Buffer): Promise<ResizedOutputs> {
    const [thumbnail, socialHd] = await Promise.all([
      this.generateThumbnail(imageBuffer),
      this.generateSocialHd(imageBuffer),
    ]);

    return { thumbnail, socialHd };
  }

  /**
   * Generates thumbnail: 400px width, quality 70, max ~200KB.
   * If initial resize exceeds 200KB, progressively reduces quality.
   */
  private async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    let quality = this.THUMBNAIL_QUALITY;

    let result = await sharp(imageBuffer)
      .resize(this.THUMBNAIL_WIDTH, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    // Progressive quality reduction to meet size constraint
    while (result.length > this.THUMBNAIL_MAX_BYTES && quality > 30) {
      quality -= 5;
      result = await sharp(imageBuffer)
        .resize(this.THUMBNAIL_WIDTH, null, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    }

    this.logger.debug(
      `Thumbnail generated: ${(result.length / 1024).toFixed(1)}KB at quality ${quality}`
    );
    return result;
  }

  /**
   * Generates Social HD: 1920px width, quality 85.
   * Target size is 1-2MB for optimal social media sharing.
   */
  private async generateSocialHd(imageBuffer: Buffer): Promise<Buffer> {
    const result = await sharp(imageBuffer)
      .resize(this.SOCIAL_HD_WIDTH, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: this.SOCIAL_HD_QUALITY, mozjpeg: true })
      .toBuffer();

    this.logger.debug(
      `Social HD generated: ${(result.length / (1024 * 1024)).toFixed(2)}MB`
    );
    return result;
  }
}
