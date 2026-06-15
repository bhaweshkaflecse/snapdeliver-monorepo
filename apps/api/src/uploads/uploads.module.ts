import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { R2Provider } from "./r2.provider";

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, R2Provider],
  exports: [UploadsService],
})
export class UploadsModule {}
