// Common schemas and utilities
export {
  UUID,
  PaginationInput,
  PaginatedResponse,
  ApiError,
} from "./schemas/common.schema";
export type {
  PaginationInput as PaginationInputType,
  PaginatedResponse as PaginatedResponseType,
  ApiError as ApiErrorType,
} from "./schemas/common.schema";

// Event schemas
export {
  PricingTier,
  CreateEventInput,
  UpdateEventInput,
  EventResponse,
} from "./schemas/event.schema";
export type {
  PricingTier as PricingTierType,
  CreateEventInput as CreateEventInputType,
  UpdateEventInput as UpdateEventInputType,
  EventResponse as EventResponseType,
} from "./schemas/event.schema";

// Upload schemas
export {
  PresignedUrlRequest,
  PresignedUrlResponse,
  CompleteUploadRequest,
} from "./schemas/upload.schema";
export type {
  PresignedUrlRequest as PresignedUrlRequestType,
  PresignedUrlResponse as PresignedUrlResponseType,
  CompleteUploadRequest as CompleteUploadRequestType,
} from "./schemas/upload.schema";

// Photo schemas
export {
  PhotoMetadata,
  PhotoResponse,
  FaceSearchRequest,
  FaceSearchResult,
  FaceSearchResponse,
} from "./schemas/photo.schema";
export type {
  PhotoMetadata as PhotoMetadataType,
  PhotoResponse as PhotoResponseType,
  FaceSearchRequest as FaceSearchRequestType,
  FaceSearchResult as FaceSearchResultType,
  FaceSearchResponse as FaceSearchResponseType,
} from "./schemas/photo.schema";
