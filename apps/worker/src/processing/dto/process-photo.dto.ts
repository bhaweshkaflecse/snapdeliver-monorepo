export interface ProcessPhotoJobPayload {
  /** The event this photo belongs to */
  eventId: string;

  /** The photo record ID in the database */
  photoId: string;

  /** The S3/R2 key of the original uploaded image */
  photoKey: string;

  /** The photographer who owns this image */
  photographerId: string;

  /** Optional watermark configuration overrides */
  watermarkConfig?: {
    text?: string;
    opacity?: number;
    fontSize?: number;
  };
}
