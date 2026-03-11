"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { BuildingTabs } from "@/components/schedule/building-tabs";
import { ViewToggle } from "@/components/schedule/view-toggle";
import { Timetable } from "@/components/schedule/timetable";
import { RoomScheduleModal } from "@/components/schedule/room-schedule-modal";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Building, Room, Booking } from "@/lib/types";
import { bookingOccursOnDate } from "@/lib/booking-utils";

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Fetch buildings on mount
  useEffect(() => {
    async function fetchBuildings() {
      try {
        const res = await fetch("/api/buildings");
        if (res.ok) {
          const data: Building[] = await res.json();
          setBuildings(data);
        }
      } catch {
        // silently handle
      }
    }
    fetchBuildings();
  }, []);

  // Auto-select building based on user role
  useEffect(() => {
    if (buildings.length === 0 || authLoading || !user) return;

    if (user.role === "admin" && user.department) {
      const userBuilding = buildings.find(
        (b) => b.code === user.department
      );
      if (userBuilding) {
        setSelectedBuilding(userBuilding.id);
      }
    } else if (user.role === "super_admin" && !selectedBuilding) {
      setSelectedBuilding(buildings[0].id);
    }
  }, [buildings, user, authLoading, selectedBuilding]);

  // Fetch rooms and bookings when building or date changes
  const fetchScheduleData = useCallback(async () => {
    if (!selectedBuilding) return;

    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const [roomsRes, bookingsRes] = await Promise.all([
        fetch(`/api/rooms?buildingId=${selectedBuilding}`),
        fetch(
          `/api/bookings?buildingId=${selectedBuilding}&date=${dateStr}`
        ),
      ]);

      if (roomsRes.ok) {
        const roomsData: Room[] = await roomsRes.json();
        setRooms(roomsData);
      }

      if (bookingsRes.ok) {
        const bookingsData: Booking[] = await bookingsRes.json();
        setBookings(bookingsData);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [selectedBuilding, selectedDate]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const isAdmin = user?.role === "admin";
  const currentBuilding = buildings.find((b) => b.id === selectedBuilding);

  const handleCellClick = (roomId: string, hour: number) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      toast.info(`Available: ${room.name} at ${hour}:00`);
    }
  };

  const handleBookingClick = (booking: Booking) => {
    toast.info(`${booking.title} - ${booking.instructor} (${booking.startTime}-${booking.endTime})`);
  };

  const fetchRoomBookings = useCallback(
    async (roomId: string, dates: string[]) => {
      try {
        const res = await fetch(`/api/bookings?roomId=${roomId}`);
        if (!res.ok) return {};
        const allBookings: Booking[] = await res.json();

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
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage room schedules across buildings. Click a room name to see its full schedule.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BuildingTabs
            buildings={buildings}
            selectedId={selectedBuilding}
            onSelect={setSelectedBuilding}
            disabled={isAdmin}
          />
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Day View
            </span>
            <Button
              variant="outline"
              size="sm"
              className="no-print"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="mb-4">
          <ViewToggle date={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {/* Timetable */}
        {loading && !rooms.length ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
            <div className="text-sm text-slate-500">
              Loading schedule...
            </div>
          </div>
        ) : (
          <Timetable
            rooms={rooms}
            bookings={bookings}
            buildingColor={currentBuilding?.color || "#f97316"}
            selectedDate={selectedDate}
            onCellClick={handleCellClick}
            onBookingClick={handleBookingClick}
            onRoomClick={setSelectedRoom}
          />
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
