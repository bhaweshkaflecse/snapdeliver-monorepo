import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

/**
 * NestJS Worker microservice bootstrap.
 * Connects to BullMQ/Redis and processes photo-processing jobs.
 *
 * This is a SEPARATE microservice from the main API.
 * It does NOT serve HTTP traffic except for the health check endpoint.
 */
async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");

  const app = await NestFactory.create(AppModule);

  const port = process.env.WORKER_PORT || 3001;
  await app.listen(port);

  logger.log(`Worker microservice listening on port ${port}`);
  logger.log(
    `Connected to Redis at ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`
  );
  logger.log("Listening for jobs on queue: photo-processing");
}

bootstrap();
