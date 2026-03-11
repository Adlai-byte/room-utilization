"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Building2, List, Grid3X3, Printer } from "lucide-react";
import { BuildingTabs } from "@/components/schedule/building-tabs";
import { Timetable } from "@/components/schedule/timetable";
import { MonthCalendar } from "@/components/schedule/month-calendar";
import { DayDetail } from "@/components/schedule/day-detail";
import { RoomScheduleModal } from "@/components/schedule/room-schedule-modal";
import { Button } from "@/components/ui/button";
import { Building, Room, Booking } from "@/lib/types";
import { bookingOccursOnDate } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

type ViewMode = "timetable" | "calendar";

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

export default function PublicSchedulePage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("timetable");

  // Room schedule modal
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Calendar-specific state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const [calLoading, setCalLoading] = useState(false);

  const isToday = useMemo(
    () => format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
    [selectedDate]
  );

  const isCurrentMonth =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth();

  // Fetch timetable data
  const fetchData = useCallback(async () => {
    if (viewMode !== "timetable") return;
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const params = new URLSearchParams({ date: dateStr });
      if (selectedBuilding) {
        params.set("buildingId", selectedBuilding);
      }

      const res = await fetch(`/api/public/schedule?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBuildings((prev) => (prev.length ? prev : data.buildings));
        setRooms(data.rooms);
        setBookings(data.bookings);

        if (!selectedBuilding && data.buildings.length > 0) {
          setSelectedBuilding(data.buildings[0].id);
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [selectedBuilding, selectedDate, viewMode]);

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    if (viewMode !== "calendar") return;
    setCalLoading(true);
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
        if (!buildings.length && data.buildings.length) {
          setBuildings(data.buildings);
        }
        if (!selectedBuilding && data.buildings.length > 0) {
          setSelectedBuilding(data.buildings[0].id);
        }
      }
    } catch {
      // silently handle
    } finally {
      setCalLoading(false);
    }
  }, [currentMonth, selectedBuilding, viewMode, buildings.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const fetchRoomBookings = useCallback(
    async (roomId: string, dates: string[]) => {
      try {
        const res = await fetch(`/api/public/schedule?`);
        if (!res.ok) return {};
        const data = await res.json();
        const allBookings: Booking[] = data.bookings.filter(
          (b: Booking) => b.roomId === roomId
        );
        const result: Record<string, Booking[]> = {};
        for (const date of dates) {
          result[date] = allBookings.filter((b) => bookingOccursOnDate(b, date));
        }
        return result;
      } catch {
        return {};
      }
    },
    []
  );

  const currentBuilding = buildings.find((b) => b.id === selectedBuilding);

  const filteredRooms = useMemo(
    () => (selectedBuilding ? rooms.filter((r) => r.buildingId === selectedBuilding) : rooms),
    [rooms, selectedBuilding]
  );

  const filteredBookings = useMemo(() => {
    const roomIds = new Set(filteredRooms.map((r) => r.id));
    return bookings.filter((b) => roomIds.has(b.roomId));
  }, [bookings, filteredRooms]);

  const calSelectedDayData = calSelectedDate && calendarData?.days[calSelectedDate];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">PA-Set</h1>
              <p className="text-xs text-slate-500">Public Room Schedule</p>
            </div>
          </div>
          <a
            href="/login"
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            Admin Login
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Building selector + View toggle */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {buildings.length > 0 && (
            <BuildingTabs
              buildings={buildings}
              selectedId={selectedBuilding}
              onSelect={setSelectedBuilding}
            />
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-3">
              <Building2 className="h-3.5 w-3.5" />
              {currentBuilding ? currentBuilding.department : "Select a building"}
            </div>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("timetable")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "timetable"
                    ? "bg-orange-100 text-orange-700"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Timetable
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "calendar"
                    ? "bg-orange-100 text-orange-700"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                Calendar
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="no-print"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Timetable View */}
        {viewMode === "timetable" && (
          <>
            {/* Date navigation */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h2>
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Today
                </Button>
              )}
            </div>

            {loading && !rooms.length ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                <div className="text-sm text-slate-500">Loading schedule...</div>
              </div>
            ) : (
              <Timetable
                rooms={filteredRooms}
                bookings={filteredBookings}
                buildingColor={currentBuilding?.color || "#f97316"}
                selectedDate={selectedDate}
                onRoomClick={setSelectedRoom}
              />
            )}
          </>
        )}

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <>
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

            {calLoading && !calendarData ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                <div className="text-sm text-slate-500">Loading calendar...</div>
              </div>
            ) : calendarData ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className={calSelectedDate ? "lg:col-span-2" : "lg:col-span-3"}>
                  <MonthCalendar
                    year={currentMonth.getFullYear()}
                    month={currentMonth.getMonth()}
                    days={calendarData.days}
                    roomNames={calendarData.rooms}
                    selectedDate={calSelectedDate}
                    onSelectDate={setCalSelectedDate}
                  />
                </div>
                {calSelectedDate && calSelectedDayData && (
                  <div className="lg:col-span-1">
                    <DayDetail
                      date={calSelectedDate}
                      bookings={calSelectedDayData.bookings}
                      roomNames={calendarData.rooms}
                      onClose={() => setCalSelectedDate(null)}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-blue-300 bg-blue-100" />
            Class
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-purple-300 bg-purple-100" />
            Event
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-green-300 bg-green-100" />
            Recurring
          </div>
          {viewMode === "timetable" && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-0.5 bg-red-500" />
              Current Time
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          This is a read-only public view. Contact your department admin to make changes to the schedule.
        </div>
      </main>

      {/* Room Schedule Modal */}
      <RoomScheduleModal
        open={!!selectedRoom}
        onOpenChange={(open) => { if (!open) setSelectedRoom(null); }}
        room={selectedRoom}
        buildingColor={currentBuilding?.color || "#f97316"}
        fetchRoomBookings={fetchRoomBookings}
      />
    </div>
  );
}
