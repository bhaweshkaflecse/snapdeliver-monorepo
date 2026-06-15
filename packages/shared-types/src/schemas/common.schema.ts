import { z } from "zod";

/**
 * UUID validator - ensures a valid UUID v4 format
 */
export const UUID = z.string().uuid();

/**
 * Pagination input schema for list endpoints
 */
export const PaginationInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationInput>;

/**
 * Generic paginated response wrapper
 */
export const PaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total_pages: z.number().int().min(0),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

/**
 * Standard API error response
 */
export const ApiError = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  error: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiError>;
