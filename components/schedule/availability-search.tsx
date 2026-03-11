"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, Building2, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { START_TIMES, END_TIMES } from "@/lib/constants";

interface AvailableRoom {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  capacity: number;
  amenities: string[];
  status: string;
}

export function AvailabilitySearch() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [results, setResults] = useState<AvailableRoom[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!date || !startTime || !endTime) {
      setError("Please fill in all required fields");
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        date,
        startTime,
        endTime,
      });

      const res = await fetch(`/api/public/availability?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Search failed");
        return;
      }

      const data = await res.json();
      setResults(data.rooms);
    } catch {
      setError("Failed to search for available rooms");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Search className="h-4 w-4 text-orange-500" />
        Find Available Rooms
      </h3>

      {/* Search Form - compact inline layout */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Date */}
        <div className="space-y-1">
          <Label htmlFor="pub-search-date" className="text-xs">
            <Clock className="inline h-3 w-3 mr-0.5" />
            Date
          </Label>
          <Input
            id="pub-search-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Start Time */}
        <div className="space-y-1">
          <Label className="text-xs">Start</Label>
          <Select
            value={startTime}
            onValueChange={(v) => v && setStartTime(v)}
          >
            <SelectTrigger className="h-8 w-28 text-sm">
              <SelectValue placeholder="Start" />
            </SelectTrigger>
            <SelectContent>
              {START_TIMES.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* End Time */}
        <div className="space-y-1">
          <Label className="text-xs">End</Label>
          <Select
            value={endTime}
            onValueChange={(v) => v && setEndTime(v)}
          >
            <SelectTrigger className="h-8 w-28 text-sm">
              <SelectValue placeholder="End" />
            </SelectTrigger>
            <SelectContent>
              {END_TIMES.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={searching}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Search className="mr-1 h-3.5 w-3.5" />
          {searching ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {/* Results */}
      {results !== null && (
        <div className="mt-3">
          {results.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-3 text-center">
              <p className="text-xs text-slate-500">
                No rooms available for the selected time slot.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">
                {results.length} room{results.length !== 1 ? "s" : ""} available
              </p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {room.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {room.buildingName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.capacity}
                        </span>
                      </div>
                    </div>
                    {room.amenities.length > 0 && (
                      <div className="ml-2 flex flex-shrink-0 flex-wrap justify-end gap-1">
                        {room.amenities.slice(0, 3).map((amenity) => (
                          <Badge
                            key={amenity}
                            variant="secondary"
                            className="text-[10px] capitalize"
                          >
                            {amenity}
                          </Badge>
                        ))}
                        {room.amenities.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{room.amenities.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
