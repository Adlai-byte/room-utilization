"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { StatCards } from "@/components/dashboard/stat-cards";
import { UtilizationChart } from "@/components/dashboard/utilization-chart";
import { PeakHoursHeatmap } from "@/components/dashboard/peak-hours-heatmap";
import { TopRooms } from "@/components/dashboard/top-rooms";

interface AnalyticsData {
  totalRooms: number;
  activeRooms: number;
  totalBookings: number;
  averageUtilization: number;
  availableNow: number;
  peakHours: Array<{ hour: number; count: number }>;
  roomRankings: Array<{
    roomId: string;
    roomName: string;
    buildingCode: string;
    bookingCount: number;
    utilizationPercent: number;
  }>;
  weeklyUtilization: Array<{ day: string; utilization: number }>;
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-slate-100"
          />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[380px] rounded-xl bg-slate-100" />
        <div className="h-[380px] rounded-xl bg-slate-100" />
      </div>

      {/* Table skeleton */}
      <div className="h-[400px] rounded-xl bg-slate-100" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  const scopeLabel =
    user?.role === "super_admin"
      ? "All Buildings"
      : user?.department
        ? user.department
        : "Your Department";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          {!authLoading && user && (
            <p className="mt-1 text-sm text-slate-500">
              Overview for{" "}
              <span className="font-medium text-orange-600">{scopeLabel}</span>
            </p>
          )}
        </div>

        {/* Content */}
        {loading || authLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <div className="space-y-6">
            {/* Stat cards */}
            <StatCards
              totalRooms={data.totalRooms}
              averageUtilization={data.averageUtilization}
              totalBookings={data.totalBookings}
              availableNow={data.availableNow}
            />

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UtilizationChart data={data.weeklyUtilization} />
              <PeakHoursHeatmap data={data.peakHours} />
            </div>

            {/* Room rankings */}
            <TopRooms data={data.roomRankings} />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
            <p className="text-sm text-slate-400">
              Unable to load dashboard data. Please try again later.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
