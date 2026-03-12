"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { Building, Room, Booking } from "@/lib/types";
import { BookingForm } from "@/components/bookings/booking-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Building2, CalendarDays } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function BookingsPage() {
  const { user, loading } = useAuth();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedType, setSelectedType] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | undefined>(
    undefined
  );
  const [loadingData, setLoadingData] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await fetch("/api/buildings");
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch {
      toast.error("Failed to fetch buildings");
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch {
      toast.error("Failed to fetch rooms");
    }
  }, []);

  const fetchBookings = useCallback(
    async (buildingId?: string, date?: string) => {
      try {
        const params = new URLSearchParams();
        if (buildingId && buildingId !== "all") {
          params.set("buildingId", buildingId);
        }
        if (date) {
          params.set("date", date);
        }
        const res = await fetch(`/api/bookings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        }
      } catch {
        toast.error("Failed to fetch bookings");
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      fetchBuildings();
      fetchRooms();
    }
  }, [user, loading, fetchBuildings, fetchRooms]);

  // Fetch bookings when building or date filter changes
  useEffect(() => {
    if (user) {
      fetchBookings(selectedBuildingId, selectedDate);
    }
  }, [user, selectedBuildingId, selectedDate, fetchBookings]);

  // Apply local filters (type, admin building restriction)
  useEffect(() => {
    let result = bookings;

    // Admin: filter to their department's building rooms
    if (user?.role === "admin" && user.department) {
      const adminBuildingIds = buildings
        .filter((b) => b.code === user.department)
        .map((b) => b.id);
      const adminRoomIds = rooms
        .filter((r) => adminBuildingIds.includes(r.buildingId))
        .map((r) => r.id);
      result = result.filter((b) => adminRoomIds.includes(b.roomId));
    }

    // Filter by type
    if (selectedType !== "all") {
      result = result.filter((b) => b.type === selectedType);
    }

    setFilteredBookings(result);
  }, [bookings, selectedType, user, buildings, rooms]);

  const getRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? room.name : "Unknown";
  };

  const getRoomBuildingName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return "Unknown";
    const building = buildings.find((b) => b.id === room.buildingId);
    return building ? building.name : "Unknown";
  };

  const getTypeBadgeClass = (type: Booking["type"]) => {
    switch (type) {
      case "class":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "event":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "recurring":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "";
    }
  };

  const handleSaveBooking = async (
    bookingData: Partial<Booking>
  ): Promise<{ ok: boolean; status?: number; conflicts?: Array<{ title: string; date: string; startTime: string; endTime: string }>; suggestions?: { alternativeRooms?: Array<{ roomId: string; roomName: string; buildingName: string; capacity: number }>; alternativeSlots?: Array<{ startTime: string; endTime: string }> } }> => {
    try {
      const isEditing = !!editingBooking;
      const res = await fetch("/api/bookings", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (res.ok) {
        toast.success(
          isEditing
            ? "Booking updated successfully"
            : "Booking created successfully"
        );
        setFormOpen(false);
        setEditingBooking(undefined);
        fetchBookings(selectedBuildingId, selectedDate);
        return { ok: true };
      }

      if (res.status === 409) {
        const data = await res.json();
        toast.error("Booking conflict detected — see suggestions below");
        return { ok: false, status: 409, conflicts: data.conflicts, suggestions: data.suggestions };
      }

      toast.error("Failed to save booking");
      return { ok: false };
    } catch {
      toast.error("An error occurred while saving the booking");
      return { ok: false };
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings?id=${bookingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Booking deleted successfully");
        fetchBookings(selectedBuildingId, selectedDate);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to delete booking");
      }
    } catch {
      toast.error("An error occurred while deleting the booking");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setFormOpen(true);
  };

  const handleAddBooking = () => {
    setEditingBooking(undefined);
    setFormOpen(true);
  };

  // Determine available buildings for the filter
  const availableBuildings =
    user?.role === "admin" && user.department
      ? buildings.filter((b) => b.code === user.department)
      : buildings;

  if (loadingData) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.role === "super_admin"
                ? "Manage bookings across all buildings"
                : "Manage bookings in your department"}
            </p>
          </div>
          <Button onClick={handleAddBooking} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={selectedBuildingId}
            onValueChange={(v) => v && setSelectedBuildingId(v)}
          >
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 text-slate-400" />
              <SelectValue
                placeholder="All Buildings"
                displayValue={selectedBuildingId === "all" ? "All Buildings" : availableBuildings.find(b => b.id === selectedBuildingId)?.name}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {availableBuildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px]"
            />
          </div>

          <Select value={selectedType} onValueChange={(v) => v && setSelectedType(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="class">Class</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bookings table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Title</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-slate-500"
                  >
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium text-slate-900">
                      {booking.title}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {getRoomName(booking.roomId)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {getRoomBuildingName(booking.roomId)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getTypeBadgeClass(booking.type)}
                      >
                        {booking.type.charAt(0).toUpperCase() +
                          booking.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {booking.instructor}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {booking.date}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {booking.startTime} - {booking.endTime}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditBooking(booking)}
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(booking.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      {/* Booking form dialog */}
      <BookingForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBooking(undefined);
        }}
        buildings={availableBuildings}
        rooms={rooms}
        booking={editingBooking}
        onSave={handleSaveBooking}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Booking"
        description="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteTarget) handleDeleteBooking(deleteTarget); }}
      />
    </AppShell>
  );
}
