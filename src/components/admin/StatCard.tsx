import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: React.ReactNode;
  color?: string;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, icon: Icon, description, color = "bg-primary" }, ref) => (
    <Card ref={ref} className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </CardContent>
    </Card>
  ),
);
StatCard.displayName = "StatCard";
