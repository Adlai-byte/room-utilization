"use client";

import { Building2, TrendingUp, BookOpen, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardsProps {
  totalRooms: number;
  averageUtilization: number;
  totalBookings: number;
  availableNow: number;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export function StatCards({
  totalRooms,
  averageUtilization,
  totalBookings,
  availableNow,
}: StatCardsProps) {
  const stats: StatItem[] = [
    {
      label: "Total Rooms",
      value: totalRooms,
      icon: <Building2 className="h-5 w-5" />,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      label: "Average Utilization",
      value: `${averageUtilization}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Active Bookings",
      value: totalBookings,
      icon: <BookOpen className="h-5 w-5" />,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      label: "Available Now",
      value: availableNow,
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${stat.iconBg} ${stat.iconColor}`}
            >
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
