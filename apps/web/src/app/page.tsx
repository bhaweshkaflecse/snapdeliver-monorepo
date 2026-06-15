import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-accent-50">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-5xl font-bold text-brand-900">
          SnapDeliver
        </h1>
        <p className="text-xl text-gray-600 max-w-lg mx-auto">
          AI-powered photo delivery for event photographers. Instant face
          matching and one-tap sharing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-white font-medium hover:bg-brand-700 transition-colors"
          >
            Photographer Dashboard
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-lg border border-brand-600 px-6 py-3 text-brand-600 font-medium hover:bg-brand-50 transition-colors"
          >
            Guest Portal Demo
          </Link>
        </div>
      </div>
    </main>
  );
}
