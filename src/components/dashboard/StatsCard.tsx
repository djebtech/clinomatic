import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Calendar, CheckCircle, Users, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const icons = {
  calendar: Calendar,
  check: CheckCircle,
  "user-check": Users,
  dollar: DollarSign,
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: keyof typeof icons;
  className?: string;
}

export function StatsCard({ title, value, subtitle, change, icon, className }: StatsCardProps) {
  const Icon = icon ? icons[icon] : null;
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {Icon && (
            <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
              <Icon className="h-5 w-5 text-teal-600" />
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-green-600" : "text-red-500")}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
