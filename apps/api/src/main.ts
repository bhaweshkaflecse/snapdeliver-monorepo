import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse CORS allowed origins from env (comma-separated)
  // In development, default to localhost origins only
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://localhost:3001"];

  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`SnapDeliver API running on port ${port}`);
}

bootstrap();
