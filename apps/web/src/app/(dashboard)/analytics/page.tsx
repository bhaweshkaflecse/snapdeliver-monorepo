"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { apiClient, type AnalyticsData } from "@/lib/api-client";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const response = await apiClient.analytics.getAll();
      if (response.error) {
        setError(response.error);
      } else {
        setAnalytics(response.data ?? []);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  // Compute totals
  const totals = analytics.reduce(
    (acc, item) => ({
      qr_scans: acc.qr_scans + item.qr_scans,
      downloads: acc.downloads + item.downloads,
      shares: acc.shares + item.shares,
    }),
    { qr_scans: 0, downloads: 0, shares: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track ROI with QR scans, downloads, and shares across all events.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total QR Scans"
          value={totals.qr_scans}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Downloads"
          value={totals.downloads}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          }
        />
        <StatsCard
          title="Total Shares"
          value={totals.shares}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          }
        />
      </div>

      {/* Per-Event Table */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Per-Event Breakdown
        </h2>
        {analytics.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No analytics data yet. Guests will generate data when they scan QR codes and find their photos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">
                    Event
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    QR Scans
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    Downloads
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    Shares
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((item) => (
                  <tr
                    key={item.event_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-2 font-medium text-gray-900">
                      {item.event_name}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">
                      {item.qr_scans}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">
                      {item.downloads}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">
                      {item.shares}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
