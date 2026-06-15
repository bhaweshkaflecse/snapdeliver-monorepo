import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UploadsModule } from "./uploads/uploads.module";
import { EventsModule } from "./events/events.module";
import { PhotosModule } from "./photos/photos.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    UploadsModule,
    EventsModule,
    PhotosModule,
  ],
})
export class AppModule {}
