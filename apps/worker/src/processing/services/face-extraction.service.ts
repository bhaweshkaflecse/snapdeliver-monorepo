import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

export interface FaceEmbedding {
  /** Bounding box: [x, y, width, height] */
  bbox: [number, number, number, number];
  /** 512-dimension face embedding vector */
  embedding: number[];
  /** Detection confidence score (0-1) */
  confidence: number;
}

/**
 * Interfaces with InsightFace to extract 512-dimension face embeddings.
 * Uses child_process to call the InsightFace model for face detection
 * and embedding extraction.
 */
@Injectable()
export class FaceExtractionService {
  private readonly logger = new Logger(FaceExtractionService.name);
  private readonly modelPath: string;

  constructor(private readonly configService: ConfigService) {
    this.modelPath =
      this.configService.get<string>("INSIGHTFACE_MODEL_PATH") ||
      "/models/insightface";
  }

  /**
   * Extracts face embeddings from the processed image.
   * Returns array of 512-dimension embedding vectors for all detected faces.
   *
   * Each embedding is a normalized float32 vector suitable for
   * cosine similarity comparison and storage in pgvector.
   */
  async extractFaces(imageBuffer: Buffer): Promise<FaceEmbedding[]> {
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(
      tempDir,
      `face_input_${Date.now()}.jpg`
    );
    const tempOutputPath = path.join(
      tempDir,
      `face_output_${Date.now()}.json`
    );

    try {
      // Write image to temporary file for InsightFace processing
      await fs.promises.writeFile(tempInputPath, imageBuffer);

      // Call InsightFace via child process
      // The script is expected to output JSON with face detections
      const { stdout } = await execFileAsync(
        "python3",
        [
          "-m",
          "insightface_extract",
          "--model-path",
          this.modelPath,
          "--input",
          tempInputPath,
          "--output",
          tempOutputPath,
        ],
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
      );

      // Read results
      const outputData = await fs.promises.readFile(tempOutputPath, "utf-8");
      const results = JSON.parse(outputData) as Array<{
        bbox: [number, number, number, number];
        embedding: number[];
        confidence: number;
      }>;

      // Validate embedding dimensions
      const validFaces: FaceEmbedding[] = results
        .filter((face) => {
          if (face.embedding.length !== 512) {
            this.logger.warn(
              `Invalid embedding dimension: ${face.embedding.length}, expected 512`
            );
            return false;
          }
          return true;
        })
        .map((face) => ({
          bbox: face.bbox,
          embedding: face.embedding,
          confidence: face.confidence,
        }));

      this.logger.log(`Extracted ${validFaces.length} face(s) from image`);
      return validFaces;
    } catch (error) {
      this.logger.error(`Face extraction failed: ${error}`);
      // Return empty array on failure - face extraction is non-blocking
      return [];
    } finally {
      // Cleanup temporary files
      await this.cleanupFile(tempInputPath);
      await this.cleanupFile(tempOutputPath);
    }
  }

  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File may not exist, ignore cleanup errors
    }
  }
}
