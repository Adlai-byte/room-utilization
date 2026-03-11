"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UtilizationChartProps {
  data: Array<{ day: string; utilization: number }>;
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          Weekly Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 13 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 13 }}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "13px",
                }}
                formatter={(value) => [`${value}%`, "Utilization"]}
              />
              <Bar
                dataKey="utilization"
                fill="#f97316"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
