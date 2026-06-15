import { Card } from "@/components/ui/Card";

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className="text-xs text-green-600 font-medium">{change}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
