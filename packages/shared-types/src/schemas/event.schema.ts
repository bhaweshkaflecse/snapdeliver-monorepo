import { z } from "zod";
import { UUID } from "./common.schema";

/**
 * Pricing tier enum matching Prisma schema
 */
export const PricingTier = z.enum(["FREE", "STANDARD", "PREMIUM"]);

export type PricingTier = z.infer<typeof PricingTier>;

/**
 * Schema for creating a new event
 */
export const CreateEventInput = z.object({
  name: z.string().min(1).max(255),
  date: z.string().datetime(),
  expiry: z.string().datetime(),
  pricing_tier: PricingTier.default("FREE"),
});

export type CreateEventInput = z.infer<typeof CreateEventInput>;

/**
 * Schema for updating an existing event
 */
export const UpdateEventInput = z.object({
  name: z.string().min(1).max(255).optional(),
  date: z.string().datetime().optional(),
  expiry: z.string().datetime().optional(),
  pricing_tier: PricingTier.optional(),
});

export type UpdateEventInput = z.infer<typeof UpdateEventInput>;

/**
 * Schema for event API response
 */
export const EventResponse = z.object({
  id: UUID,
  name: z.string(),
  date: z.string().datetime(),
  expiry: z.string().datetime(),
  pricing_tier: PricingTier,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type EventResponse = z.infer<typeof EventResponse>;
