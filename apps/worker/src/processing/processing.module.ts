import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ProcessingProcessor } from "./processing.processor";
import { ExifService } from "./services/exif.service";
import { PresetService } from "./services/preset.service";
import { ColorAnalysisService } from "./services/color-analysis.service";
import { WatermarkService } from "./services/watermark.service";
import { ResizeService } from "./services/resize.service";
import { FaceExtractionService } from "./services/face-extraction.service";
import { StorageService } from "./services/storage.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "photo-processing",
    }),
  ],
  providers: [
    ProcessingProcessor,
    ExifService,
    PresetService,
    ColorAnalysisService,
    WatermarkService,
    ResizeService,
    FaceExtractionService,
    StorageService,
  ],
  exports: [PresetService],
})
export class ProcessingModule {}
