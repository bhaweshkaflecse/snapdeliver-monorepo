"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QRGenerator } from "@/components/dashboard/QRGenerator";
import { apiClient, type EventData, type PhotoData, type AnalyticsData } from "@/lib/api-client";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [eventRes, photosRes, analyticsRes] = await Promise.all([
        apiClient.events.get(eventId),
        apiClient.photos.listByEvent(eventId),
        apiClient.analytics.getByEvent(eventId),
      ]);

      if (eventRes.error) {
        setError(eventRes.error);
      } else {
        setEvent(eventRes.data);
        setPhotos(photosRes.data ?? []);
        setAnalytics(analyticsRes.data ?? null);
      }
      setLoading(false);
    }
    fetchData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error || "Event not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date(event.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="QR Scans"
          value={analytics?.qr_scans ?? 0}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
          }
        />
        <StatsCard
          title="Downloads"
          value={analytics?.downloads ?? 0}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          }
        />
        <StatsCard
          title="Shares"
          value={analytics?.shares ?? 0}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Photo Gallery */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Photos ({photos.length})
            </h2>
            {photos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No photos uploaded yet. Use the desktop app to upload photos.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={photo.thumbnail_key || photo.original_key}
                      alt="Event photo"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* QR Code */}
        <div>
          <Card>
            <QRGenerator eventId={eventId} eventName={event.name} />
          </Card>
        </div>
      </div>
    </div>
  );
}
