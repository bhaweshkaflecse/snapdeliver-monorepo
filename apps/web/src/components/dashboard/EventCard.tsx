"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { EventData } from "@/lib/api-client";

interface EventCardProps {
  event: EventData;
}

const tierColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  STANDARD: "bg-brand-100 text-brand-700",
  PREMIUM: "bg-accent-100 text-accent-700",
};

export function EventCard({ event }: EventCardProps) {
  const isExpired = new Date(event.expiry) < new Date();
  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {event.name}
            </h3>
            <p className="text-sm text-gray-500">{eventDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tierColors[event.pricing_tier] || tierColors.FREE
              }`}
            >
              {event.pricing_tier}
            </span>
            {isExpired && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                Expired
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
