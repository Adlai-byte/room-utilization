"use client";

import { AlertTriangle, ArrowRight, Clock, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConflictInfo {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface AlternativeRoom {
  roomId: string;
  roomName: string;
  buildingName: string;
  capacity: number;
}

interface AlternativeSlot {
  startTime: string;
  endTime: string;
}

interface Suggestions {
  alternativeRooms?: AlternativeRoom[];
  alternativeSlots?: AlternativeSlot[];
}

interface ConflictAlertProps {
  conflicts: ConflictInfo[];
  suggestions?: Suggestions;
  onSelectRoom?: (roomId: string) => void;
  onSelectSlot?: (startTime: string, endTime: string) => void;
}

export function ConflictAlert({ conflicts, suggestions, onSelectRoom, onSelectSlot }: ConflictAlertProps) {
  if (!conflicts || conflicts.length === 0) return null;

  const hasRoomSuggestions = suggestions?.alternativeRooms && suggestions.alternativeRooms.length > 0;
  const hasSlotSuggestions = suggestions?.alternativeSlots && suggestions.alternativeSlots.length > 0;
  const hasSuggestions = hasRoomSuggestions || hasSlotSuggestions;

  return (
    <div className="space-y-3">
      {/* Conflict info */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800">
              Booking Conflict Detected
            </h4>
            <p className="mt-1 text-sm text-red-700">
              The selected time slot conflicts with the following existing{" "}
              {conflicts.length === 1 ? "booking" : "bookings"}:
            </p>
            <ul className="mt-2 space-y-1.5">
              {conflicts.map((conflict, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-red-700"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  <span>
                    <span className="font-medium">{conflict.title}</span>
                    {" - "}
                    {conflict.date}, {conflict.startTime} - {conflict.endTime}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {hasSuggestions && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h4 className="text-sm font-semibold text-orange-800 mb-3">
            Available Alternatives
          </h4>

          {/* Alternative time slots */}
          {hasSlotSuggestions && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 mb-2">
                <Clock className="h-3.5 w-3.5" />
                Alternative Time Slots (same room)
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions!.alternativeSlots!.map((slot, i) => (
                  <Button
                    key={i}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => onSelectSlot?.(slot.startTime, slot.endTime)}
                  >
                    {slot.startTime} - {slot.endTime}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Alternative rooms */}
          {hasRoomSuggestions && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 mb-2">
                <DoorOpen className="h-3.5 w-3.5" />
                Alternative Rooms (same time)
              </div>
              <div className="space-y-1.5">
                {suggestions!.alternativeRooms!.map((room) => (
                  <button
                    key={room.roomId}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-orange-200 bg-white px-3 py-2 text-sm hover:bg-orange-50 transition-colors"
                    onClick={() => onSelectRoom?.(room.roomId)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{room.roomName}</span>
                      <span className="text-xs text-slate-500">{room.buildingName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Cap: {room.capacity}</span>
                      <ArrowRight className="h-3 w-3 text-orange-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
