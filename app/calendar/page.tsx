"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { BuildingTabs } from "@/components/schedule/building-tabs";
import { MonthCalendar } from "@/components/schedule/month-calendar";
import { DayDetail } from "@/components/schedule/day-detail";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Building } from "@/lib/types";

interface CalendarData {
  buildings: Building[];
  rooms: Record<string, string>;
  days: Record<
    string,
    {
      count: number;
      bookings: Array<{
        title: string;
        type: string;
        startTime: string;
        endTime: string;
        instructor: string;
        roomId: string;
      }>;
    }
  >;
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Auto-select building for admin
  useEffect(() => {
    if (buildings.length === 0 || authLoading || !user) return;
    if (user.role === "admin" && user.department) {
      const userBuilding = buildings.find((b) => b.code === user.department);
      if (userBuilding) setSelectedBuilding(userBuilding.id);
    } else if (!selectedBuilding) {
      setSelectedBuilding(buildings[0].id);
    }
  }, [buildings, user, authLoading, selectedBuilding]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: currentMonth.getFullYear().toString(),
        month: currentMonth.getMonth().toString(),
      });
      if (selectedBuilding) {
        params.set("buildingId", selectedBuilding);
      }

      const res = await fetch(`/api/public/calendar?${params.toString()}`);
      if (res.ok) {
        const data: CalendarData = await res.json();
        setCalendarData(data);
        if (data.buildings.length > 0 && !buildings.length) {
          setBuildings(data.buildings);
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedBuilding, buildings.length]);

  useEffect(() => {
    if (user) fetchCalendar();
  }, [fetchCalendar, user]);

  const isAdmin = user?.role === "admin";
  const isCurrentMonth =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth();

  const selectedDayData = selectedDate && calendarData?.days[selectedDate];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-slate-500">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monthly overview of room bookings.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {buildings.length > 0 && (
            <BuildingTabs
              buildings={buildings}
              selectedId={selectedBuilding}
              onSelect={setSelectedBuilding}
              disabled={isAdmin}
            />
          )}
        </div>

        {/* Month navigation */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="text-orange-600 hover:text-orange-700"
            >
              This Month
            </Button>
          )}
        </div>

        {/* Calendar + Day Detail */}
        {loading && !calendarData ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
            <div className="text-sm text-slate-500">Loading calendar...</div>
          </div>
        ) : calendarData ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={selectedDate ? "lg:col-span-2" : "lg:col-span-3"}>
              <MonthCalendar
                year={currentMonth.getFullYear()}
                month={currentMonth.getMonth()}
                days={calendarData.days}
                roomNames={calendarData.rooms}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>

            {selectedDate && selectedDayData && (
              <div className="lg:col-span-1">
                <DayDetail
                  date={selectedDate}
                  bookings={selectedDayData.bookings}
                  roomNames={calendarData.rooms}
                  onClose={() => setSelectedDate(null)}
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-400" />
            Class
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-purple-400" />
            Event
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-400" />
            Recurring
          </div>
        </div>
      </main>
    </div>
  );
}
