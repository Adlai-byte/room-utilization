"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PeakHoursHeatmapProps {
  data: Array<{ hour: number; count: number }>;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function getIntensityClass(count: number, maxCount: number): string {
  if (maxCount === 0) return "bg-orange-50";
  const ratio = count / maxCount;
  if (ratio >= 0.8) return "bg-orange-600";
  if (ratio >= 0.6) return "bg-orange-500";
  if (ratio >= 0.4) return "bg-orange-400";
  if (ratio >= 0.2) return "bg-orange-300";
  if (ratio > 0) return "bg-orange-200";
  return "bg-orange-50";
}

function getTextClass(count: number, maxCount: number): string {
  if (maxCount === 0) return "text-orange-400";
  const ratio = count / maxCount;
  if (ratio >= 0.4) return "text-white";
  return "text-orange-700";
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  // Filter to show hours 7AM-5PM
  const filteredData = data.filter((d) => d.hour >= 7 && d.hour <= 17);
  const maxCount = Math.max(...filteredData.map((d) => d.count), 1);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          Peak Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {filteredData.map((item) => {
            const widthPercent =
              maxCount > 0 ? Math.max((item.count / maxCount) * 100, 4) : 4;
            return (
              <div key={item.hour} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-right text-sm font-medium text-slate-500">
                  {formatHour(item.hour)}
                </span>
                <div className="relative flex h-8 flex-1 items-center rounded-md bg-slate-50">
                  <div
                    className={`flex h-full items-center rounded-md transition-all ${getIntensityClass(
                      item.count,
                      maxCount
                    )}`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span
                      className={`px-2 text-xs font-semibold ${getTextClass(
                        item.count,
                        maxCount
                      )}`}
                    >
                      {item.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Low activity</span>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-orange-100" />
            <div className="h-3 w-3 rounded-sm bg-orange-200" />
            <div className="h-3 w-3 rounded-sm bg-orange-300" />
            <div className="h-3 w-3 rounded-sm bg-orange-400" />
            <div className="h-3 w-3 rounded-sm bg-orange-500" />
            <div className="h-3 w-3 rounded-sm bg-orange-600" />
          </div>
          <span>High activity</span>
        </div>
      </CardContent>
    </Card>
  );
}
