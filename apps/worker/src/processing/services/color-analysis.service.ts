import { Injectable, Logger } from "@nestjs/common";
import * as sharp from "sharp";

export interface ColorAnalysisResult {
  /** Average red channel value (0-255) */
  avgRed: number;
  /** Average green channel value (0-255) */
  avgGreen: number;
  /** Average blue channel value (0-255) */
  avgBlue: number;
  /** Whether a green color cast was detected (Nepal party palace lighting) */
  greenCastDetected: boolean;
  /** Whether a magenta color cast was detected */
  magentaCastDetected: boolean;
  /** Whether the Color Neutralize preset should override EXIF selection */
  shouldOverridePreset: boolean;
}

/**
 * CRITICAL HEURISTIC: Analyzes raw pixel data to detect extreme color casts.
 *
 * Nepal party palace lighting commonly produces:
 * - Green cast from fluorescent/LED tubes
 * - Magenta cast from decorative lighting
 *
 * If green channel > 1.3x red channel OR magenta (R+B >> G) above threshold,
 * overrides the EXIF-based preset with 'Color Neutralize'.
 */
@Injectable()
export class ColorAnalysisService {
  private readonly logger = new Logger(ColorAnalysisService.name);

  /** Threshold: green must be 1.3x red to trigger green cast detection */
  private readonly GREEN_CAST_RATIO = 1.3;

  /** Threshold: (R+B)/2 must be 1.4x G to trigger magenta cast detection */
  private readonly MAGENTA_CAST_RATIO = 1.4;

  /**
   * Analyzes image buffer for color channel deviation.
   * Samples the image at reduced resolution for performance.
   */
  async analyzeColorCast(buffer: Buffer): Promise<ColorAnalysisResult> {
    try {
      // Resize to small sample for fast pixel analysis (128x128)
      const { data, info } = await sharp(buffer)
        .resize(128, 128, { fit: "cover" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixelCount = info.width * info.height;
      let totalRed = 0;
      let totalGreen = 0;
      let totalBlue = 0;

      // Sum all channel values from raw RGB pixel data
      for (let i = 0; i < data.length; i += 3) {
        totalRed += data[i];
        totalGreen += data[i + 1];
        totalBlue += data[i + 2];
      }

      const avgRed = totalRed / pixelCount;
      const avgGreen = totalGreen / pixelCount;
      const avgBlue = totalBlue / pixelCount;

      // Green cast detection: green channel dominates red by 1.3x ratio
      const greenCastDetected = avgGreen > avgRed * this.GREEN_CAST_RATIO;

      // Magenta cast detection: average of R+B significantly exceeds G
      const magentaAvg = (avgRed + avgBlue) / 2;
      const magentaCastDetected =
        magentaAvg > avgGreen * this.MAGENTA_CAST_RATIO;

      const shouldOverridePreset = greenCastDetected || magentaCastDetected;

      if (shouldOverridePreset) {
        this.logger.warn(
          `Color cast detected - Green: ${greenCastDetected}, Magenta: ${magentaCastDetected}. ` +
            `Channels: R=${avgRed.toFixed(1)}, G=${avgGreen.toFixed(1)}, B=${avgBlue.toFixed(1)}. ` +
            `Overriding preset with Color Neutralize.`
        );
      } else {
        this.logger.debug(
          `Color analysis normal - R=${avgRed.toFixed(1)}, G=${avgGreen.toFixed(1)}, B=${avgBlue.toFixed(1)}`
        );
      }

      return {
        avgRed,
        avgGreen,
        avgBlue,
        greenCastDetected,
        magentaCastDetected,
        shouldOverridePreset,
      };
    } catch (error) {
      this.logger.error(`Color analysis failed: ${error}`);
      // If analysis fails, do not override - return safe defaults
      return {
        avgRed: 128,
        avgGreen: 128,
        avgBlue: 128,
        greenCastDetected: false,
        magentaCastDetected: false,
        shouldOverridePreset: false,
      };
    }
  }
}
