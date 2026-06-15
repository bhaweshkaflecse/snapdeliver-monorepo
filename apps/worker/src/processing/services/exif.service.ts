import { Injectable, Logger } from "@nestjs/common";
import * as sharp from "sharp";

export interface ExifData {
  iso: number | null;
  aperture: number | null;
  whiteBalance: string | null;
  flash: boolean;
  exposureTime: number | null;
  focalLength: number | null;
}

@Injectable()
export class ExifService {
  private readonly logger = new Logger(ExifService.name);

  /**
   * Extracts EXIF data from an image buffer using Sharp metadata.
   * Returns structured EXIF fields relevant for preset selection.
   *
   * Sharp's metadata() provides top-level fields (density, space, channels)
   * and an exif Buffer which we parse using the exif-reader approach.
   * We use a lightweight IFD0/EXIF IFD parser to extract the fields we need.
   */
  async extractExif(buffer: Buffer): Promise<ExifData> {
    try {
      const metadata = await sharp(buffer).metadata();
      const exif = metadata.exif
        ? this.parseExifBuffer(metadata.exif)
        : {};

      return {
        iso: this.extractNumeric(exif, "ISOSpeedRatings") ?? null,
        aperture: this.extractNumeric(exif, "FNumber") ?? null,
        whiteBalance: this.extractString(exif, "WhiteBalance") ?? null,
        flash: this.extractFlash(exif),
        exposureTime: this.extractNumeric(exif, "ExposureTime") ?? null,
        focalLength: this.extractNumeric(exif, "FocalLength") ?? null,
      };
    } catch (error) {
      this.logger.warn(`Failed to extract EXIF data: ${error}`);
      return {
        iso: null,
        aperture: null,
        whiteBalance: null,
        flash: false,
        exposureTime: null,
        focalLength: null,
      };
    }
  }

  /**
   * Parse raw EXIF buffer (TIFF structured) into a key-value map.
   * Sharp provides metadata.exif as the raw APP1 EXIF data starting
   * after the EXIF header marker (Exif\0\0).
   *
   * This parser handles the standard TIFF IFD structure to extract
   * the tags we need for preset selection.
   */
  private parseExifBuffer(
    exifBuffer: Buffer
  ): Record<string, string | number | undefined> {
    const result: Record<string, string | number | undefined> = {};

    try {
      // The exif buffer from Sharp starts with 'Exif\0\0' (6 bytes) followed by TIFF data
      let offset = 0;

      // Check for Exif header
      if (
        exifBuffer.length > 6 &&
        exifBuffer.toString("ascii", 0, 4) === "Exif"
      ) {
        offset = 6;
      }

      if (exifBuffer.length < offset + 8) return result;

      // Determine byte order (II = little-endian, MM = big-endian)
      const byteOrder = exifBuffer.toString("ascii", offset, offset + 2);
      const le = byteOrder === "II";

      const readUInt16 = (pos: number): number =>
        le
          ? exifBuffer.readUInt16LE(pos)
          : exifBuffer.readUInt16BE(pos);

      const readUInt32 = (pos: number): number =>
        le
          ? exifBuffer.readUInt32LE(pos)
          : exifBuffer.readUInt32BE(pos);

      const readRational = (pos: number): number => {
        const numerator = readUInt32(pos);
        const denominator = readUInt32(pos + 4);
        return denominator === 0 ? 0 : numerator / denominator;
      };

      // Verify TIFF magic number (42)
      const magic = readUInt16(offset + 2);
      if (magic !== 42) return result;

      // Get IFD0 offset
      const ifd0Offset = readUInt32(offset + 4) + offset;

      // Parse IFD0 to find the ExifIFD pointer
      const parseIFD = (ifdOffset: number): void => {
        if (ifdOffset + 2 > exifBuffer.length) return;

        const entryCount = readUInt16(ifdOffset);
        let exifIFDOffset = 0;

        for (let i = 0; i < entryCount; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          if (entryOffset + 12 > exifBuffer.length) break;

          const tag = readUInt16(entryOffset);
          const type = readUInt16(entryOffset + 2);
          const count = readUInt32(entryOffset + 4);
          const valueOffset = entryOffset + 8;

          // Tag 0x8769 = ExifIFD pointer
          if (tag === 0x8769) {
            exifIFDOffset = readUInt32(valueOffset) + offset;
          }
        }

        // Parse Exif IFD for the tags we need
        if (exifIFDOffset > 0 && exifIFDOffset + 2 <= exifBuffer.length) {
          const exifEntryCount = readUInt16(exifIFDOffset);

          for (let i = 0; i < exifEntryCount; i++) {
            const entryOffset = exifIFDOffset + 2 + i * 12;
            if (entryOffset + 12 > exifBuffer.length) break;

            const tag = readUInt16(entryOffset);
            const type = readUInt16(entryOffset + 2);
            const count = readUInt32(entryOffset + 4);
            const valueOffset = entryOffset + 8;

            switch (tag) {
              case 0x8827: // ISOSpeedRatings
                result["ISOSpeedRatings"] = readUInt16(valueOffset);
                break;

              case 0x829d: // FNumber (RATIONAL)
                {
                  const dataOffset =
                    count * this.typeSize(type) > 4
                      ? readUInt32(valueOffset) + offset
                      : valueOffset;
                  if (dataOffset + 8 <= exifBuffer.length) {
                    result["FNumber"] = readRational(dataOffset);
                  }
                }
                break;

              case 0x9209: // Flash
                result["Flash"] = readUInt16(valueOffset);
                break;

              case 0x829a: // ExposureTime (RATIONAL)
                {
                  const dataOffset =
                    count * this.typeSize(type) > 4
                      ? readUInt32(valueOffset) + offset
                      : valueOffset;
                  if (dataOffset + 8 <= exifBuffer.length) {
                    result["ExposureTime"] = readRational(dataOffset);
                  }
                }
                break;

              case 0x920a: // FocalLength (RATIONAL)
                {
                  const dataOffset =
                    count * this.typeSize(type) > 4
                      ? readUInt32(valueOffset) + offset
                      : valueOffset;
                  if (dataOffset + 8 <= exifBuffer.length) {
                    result["FocalLength"] = readRational(dataOffset);
                  }
                }
                break;

              case 0xa403: // WhiteBalance
                result["WhiteBalance"] =
                  readUInt16(valueOffset) === 0 ? "Auto" : "Manual";
                break;
            }
          }
        }
      };

      parseIFD(ifd0Offset);
    } catch (error) {
      this.logger.debug(`EXIF buffer parse failed, returning partial data: ${error}`);
    }

    return result;
  }

  /**
   * Returns the byte size for a TIFF type identifier.
   */
  private typeSize(type: number): number {
    switch (type) {
      case 1: return 1; // BYTE
      case 2: return 1; // ASCII
      case 3: return 2; // SHORT
      case 4: return 4; // LONG
      case 5: return 8; // RATIONAL
      case 7: return 1; // UNDEFINED
      case 9: return 4; // SLONG
      case 10: return 8; // SRATIONAL
      default: return 1;
    }
  }

  private extractNumeric(
    exif: Record<string, string | number | undefined>,
    key: string
  ): number | undefined {
    const val = exif[key];
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private extractString(
    exif: Record<string, string | number | undefined>,
    key: string
  ): string | undefined {
    const val = exif[key];
    return typeof val === "string" ? val : undefined;
  }

  private extractFlash(
    exif: Record<string, string | number | undefined>
  ): boolean {
    const flash = exif["Flash"];
    if (typeof flash === "number") return (flash & 0x01) === 1;
    if (typeof flash === "string")
      return flash.toLowerCase().includes("fired");
    return false;
  }
}
