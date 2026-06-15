"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiClient, type EventData } from "@/lib/api-client";

export default function EventPortalPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true);
      const response = await apiClient.events.get(eventId);
      if (response.error) {
        setError(response.error);
      } else {
        setEvent(response.data);
      }
      setLoading(false);

      // Track QR scan
      await apiClient.track.qrScan(eventId);
    }
    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg
          className="animate-spin h-8 w-8 text-brand-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !event) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 font-medium">Event not found</p>
          <p className="text-sm text-gray-500 mt-2">
            This link may be expired or invalid.
          </p>
        </div>
      </Card>
    );
  }

  const isExpired = new Date(event.expiry) < new Date();

  if (isExpired) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-900 font-semibold text-lg">Event Expired</p>
          <p className="text-sm text-gray-500 mt-2">
            The photo delivery period for this event has ended.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        <p className="text-sm text-gray-500">
          {new Date(event.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-50">
          <svg
            className="h-16 w-16 text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Find Your Photos
          </h2>
          <p className="text-sm text-gray-500 max-w-xs">
            Take a quick selfie and our AI will find all photos of you from the
            event.
          </p>
        </div>
      </div>

      <Link href={`/${eventId}/selfie`} className="w-full max-w-xs">
        <Button size="lg" className="w-full">
          Take a Selfie
        </Button>
      </Link>
    </div>
  );
}
