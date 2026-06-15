import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as sharp from "sharp";

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);
  private readonly watermarkText: string;

  constructor(private readonly configService: ConfigService) {
    this.watermarkText =
      this.configService.get<string>("WATERMARK_TEXT") || "SnapDeliver";
  }

  /**
   * Composites a semi-transparent text watermark onto the image.
   * Positioned in the bottom-right corner.
   * Uses SVG text overlay via Sharp composite.
   */
  async applyWatermark(
    imageBuffer: Buffer,
    options?: { text?: string; opacity?: number; fontSize?: number }
  ): Promise<Buffer> {
    const text = options?.text || this.watermarkText;
    const opacity = options?.opacity ?? 0.4;
    const fontSize = options?.fontSize ?? 48;

    try {
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 1920;
      const height = metadata.height || 1080;

      // Create SVG text overlay positioned bottom-right
      const svgText = this.createWatermarkSvg(
        text,
        width,
        height,
        opacity,
        fontSize
      );

      const svgBuffer = Buffer.from(svgText);

      // Composite the SVG watermark onto the image
      const result = await sharp(imageBuffer)
        .composite([
          {
            input: svgBuffer,
            gravity: "southeast",
          },
        ])
        .toBuffer();

      this.logger.debug(`Watermark applied: "${text}" at opacity ${opacity}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to apply watermark: ${error}`);
      // Return original buffer if watermark fails
      return imageBuffer;
    }
  }

  /**
   * Creates an SVG element with the watermark text.
   * The text is white with configurable opacity, positioned bottom-right.
   */
  private createWatermarkSvg(
    text: string,
    imageWidth: number,
    imageHeight: number,
    opacity: number,
    fontSize: number
  ): string {
    // Calculate SVG dimensions for bottom-right positioning
    const svgWidth = Math.min(imageWidth, text.length * fontSize * 0.6 + 40);
    const svgHeight = fontSize + 20;

    return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${svgWidth - 20}"
    y="${svgHeight - 10}"
    font-family="Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    fill-opacity="${opacity}"
    text-anchor="end"
    dominant-baseline="auto"
  >${this.escapeXml(text)}</text>
</svg>`;
  }

  /**
   * Escapes special XML characters in text for SVG safety.
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
