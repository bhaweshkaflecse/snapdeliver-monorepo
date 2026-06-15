"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { apiClient } from "@/lib/api-client";

interface FormErrors {
  name?: string;
  date?: string;
  expiry?: string;
  pricing_tier?: string;
}

const PRICING_TIERS = [
  { value: "FREE", label: "Free - Basic delivery" },
  { value: "STANDARD", label: "Standard - HD + watermark" },
  { value: "PREMIUM", label: "Premium - All formats + priority" },
];

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    expiry: "",
    pricing_tier: "FREE" as "FREE" | "STANDARD" | "PREMIUM",
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = "Event name is required";
    } else if (formData.name.length > 255) {
      newErrors.name = "Event name must be 255 characters or less";
    }

    if (!formData.date) {
      newErrors.date = "Event date is required";
    }

    if (!formData.expiry) {
      newErrors.expiry = "Expiry date is required";
    } else if (formData.date && new Date(formData.expiry) <= new Date(formData.date)) {
      newErrors.expiry = "Expiry must be after the event date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    const response = await apiClient.events.create({
      name: formData.name.trim(),
      date: new Date(formData.date).toISOString(),
      expiry: new Date(formData.expiry).toISOString(),
      pricing_tier: formData.pricing_tier,
    });

    if (response.error) {
      setServerError(response.error);
      setLoading(false);
    } else {
      router.push("/events");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a new photography event for photo delivery.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Input
            label="Event Name"
            placeholder="e.g., Johnson Wedding 2024"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            error={errors.name}
            required
          />

          <Input
            label="Event Date"
            type="datetime-local"
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            error={errors.date}
            required
          />

          <Input
            label="Expiry Date"
            type="datetime-local"
            value={formData.expiry}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, expiry: e.target.value }))
            }
            error={errors.expiry}
            required
          />

          <Select
            label="Pricing Tier"
            options={PRICING_TIERS}
            value={formData.pricing_tier}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                pricing_tier: e.target.value as "FREE" | "STANDARD" | "PREMIUM",
              }))
            }
            error={errors.pricing_tier}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Event
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
