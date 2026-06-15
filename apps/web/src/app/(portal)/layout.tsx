import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Your Photos - SnapDeliver",
  description: "Take a selfie to find your event photos instantly.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-center h-14 px-4">
          <span className="text-sm font-semibold text-brand-600">
            SnapDeliver
          </span>
        </div>
      </header>

      {/* Full viewport content */}
      <main className="flex flex-col flex-1 px-4 py-6 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}
