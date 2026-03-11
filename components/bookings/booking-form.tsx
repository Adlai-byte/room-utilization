"use client";

import { useState, useEffect, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { Building, Room, Booking } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConflictAlert } from "./conflict-alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { START_TIMES, END_TIMES, DAY_OPTIONS, to12Hour } from "@/lib/constants";

interface ConflictInfo {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface Suggestions {
  alternativeRooms?: Array<{ roomId: string; roomName: string; buildingName: string; capacity: number }>;
  alternativeSlots?: Array<{ startTime: string; endTime: string }>;
}

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildings: Building[];
  rooms: Room[];
  booking?: Booking;
  onSave: (data: Partial<Booking>) => Promise<{ ok: boolean; status?: number; conflicts?: ConflictInfo[]; suggestions?: Suggestions }>;
}

export function BookingForm({
  open,
  onOpenChange,
  buildings,
  rooms,
  booking,
  onSave,
}: BookingFormProps) {
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState("");
  const [type, setType] = useState<Booking["type"]>("class");
  const [instructor, setInstructor] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [recurrenceType] = useState<"weekly">("weekly");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions | undefined>();
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens or booking changes
  useEffect(() => {
    if (open) {
      setConflicts([]);
      setSuggestions(undefined);
      if (booking) {
        setTitle(booking.title);
        setRoomId(booking.roomId);
        setType(booking.type);
        setInstructor(booking.instructor);
        setDate(booking.date);
        setStartTime(booking.startTime);
        setEndTime(booking.endTime);
        if (booking.recurrence) {
          setRecurrenceDays(booking.recurrence.days || []);
          setRecurrenceUntil(booking.recurrence.until || "");
        } else {
          setRecurrenceDays([]);
          setRecurrenceUntil("");
        }
      } else {
        setTitle("");
        setRoomId("");
        setType("class");
        setInstructor("");
        setDate("");
        setStartTime("07:00");
        setEndTime("08:00");
        setRecurrenceDays([]);
        setRecurrenceUntil("");
        setSuggestions(undefined);
      }
    }
  }, [open, booking]);

  const toggleDay = (day: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const showRecurrence = type === "class" || type === "recurring";

  const minDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const maxDate = useMemo(() => format(addMonths(new Date(), 6), "yyyy-MM-dd"), []);

  // Group rooms by building
  const roomsByBuilding = buildings
    .map((building) => ({
      building,
      rooms: rooms.filter((r) => r.buildingId === building.id && r.status === "active"),
    }))
    .filter((group) => group.rooms.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflicts([]);
    setSuggestions(undefined);
    setSaving(true);

    const bookingData: Partial<Booking> = {
      roomId,
      title,
      type,
      instructor,
      date,
      startTime,
      endTime,
    };

    if (showRecurrence && recurrenceDays.length > 0 && recurrenceUntil) {
      bookingData.recurrence = {
        type: recurrenceType,
        days: recurrenceDays,
        until: recurrenceUntil,
      };
    }

    if (booking) {
      bookingData.id = booking.id;
      bookingData.userId = booking.userId;
    }

    try {
      const result = await onSave(bookingData);
      if (result.status === 409 && result.conflicts) {
        setConflicts(result.conflicts);
        setSuggestions(result.suggestions);
      }
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {booking ? "Edit Booking" : "New Booking"}
          </DialogTitle>
          <DialogDescription>
            {booking
              ? "Update the booking details below."
              : "Fill in the details to create a new booking."}
          </DialogDescription>
        </DialogHeader>

        {conflicts.length > 0 && (
          <ConflictAlert
            conflicts={conflicts}
            suggestions={suggestions}
            onSelectRoom={(id) => {
              setRoomId(id);
              setConflicts([]);
              setSuggestions(undefined);
            }}
            onSelectSlot={(start, end) => {
              setStartTime(start);
              setEndTime(end);
              setConflicts([]);
              setSuggestions(undefined);
            }}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="booking-title">Title</Label>
            <Input
              id="booking-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., CS101 - Introduction to Programming"
              required
            />
          </div>

          {/* Room (grouped by building) */}
          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={(v) => v && setRoomId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {roomsByBuilding.map((group) => (
                  <SelectGroup key={group.building.id}>
                    <SelectLabel>{group.building.name}</SelectLabel>
                    {group.rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} (Cap: {room.capacity})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(val) => val && setType(val as Booking["type"])}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class">Class</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instructor */}
          <div className="space-y-1.5">
            <Label htmlFor="booking-instructor">Instructor</Label>
            <Input
              id="booking-instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="e.g., Dr. Smith"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="booking-date">Date</Label>
            <Input
              id="booking-date"
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={(v) => v && setStartTime(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {START_TIMES.map((time) => (
                    <SelectItem key={time} value={time}>
                      {to12Hour(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={(v) => v && setEndTime(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {END_TIMES.map((time) => (
                    <SelectItem key={time} value={time}>
                      {to12Hour(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence section */}
          {showRecurrence && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-medium text-slate-700">
                Recurrence (Weekly)
              </h4>

              {/* Day checkboxes */}
              <div className="space-y-1.5">
                <Label>Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-1.5 cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors"
                    >
                      <Checkbox
                        checked={recurrenceDays.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span className="text-slate-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Until date */}
              <div className="space-y-1.5">
                <Label htmlFor="recurrence-until">Until</Label>
                <Input
                  id="recurrence-until"
                  type="date"
                  value={recurrenceUntil}
                  min={date || minDate}
                  max={maxDate}
                  onChange={(e) => setRecurrenceUntil(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : booking
                ? "Update Booking"
                : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
