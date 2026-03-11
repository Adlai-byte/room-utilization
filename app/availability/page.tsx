"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, Building2, Users, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/lib/auth";
import { Building } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AMENITY_OPTIONS, START_TIMES, END_TIMES } from "@/lib/constants";

interface AvailableRoom {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  capacity: number;
  amenities: string[];
  status: string;
}

export default function AvailabilityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [buildingId, setBuildingId] = useState("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [results, setResults] = useState<AvailableRoom[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch buildings
  const fetchBuildings = useCallback(async () => {
    try {
      const res = await fetch("/api/buildings");
      if (res.ok) {
        const data: Building[] = await res.json();
        setBuildings(data);
      }
    } catch {
      toast.error("Failed to fetch buildings");
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBuildings();
    }
  }, [user, fetchBuildings]);

  // Auto-select building for admin users
  useEffect(() => {
    if (user?.role === "admin" && user.department && buildings.length > 0) {
      const userBuilding = buildings.find((b) => b.code === user.department);
      if (userBuilding) {
        setBuildingId(userBuilding.id);
      }
    }
  }, [user, buildings]);

  // Filter buildings for admin users
  const availableBuildings =
    user?.role === "admin" && user.department
      ? buildings.filter((b) => b.code === user.department)
      : buildings;

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSearch = async () => {
    if (!date || !startTime || !endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        date,
        startTime,
        endTime,
      });

      if (buildingId && buildingId !== "all") {
        params.set("buildingId", buildingId);
      }

      if (minCapacity && parseInt(minCapacity) > 0) {
        params.set("capacity", minCapacity);
      }

      if (selectedAmenities.length > 0) {
        params.set("amenities", selectedAmenities.join(","));
      }

      const res = await fetch(`/api/availability?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Search failed");
        return;
      }

      const data = await res.json();
      setResults(data.rooms);
    } catch {
      toast.error("Failed to search for available rooms");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Room Availability Search
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Find available rooms by date, time, and requirements.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-orange-500" />
              Search Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="search-date">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />
                  Date
                </Label>
                <Input
                  id="search-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Select
                  value={startTime}
                  onValueChange={(v) => v && setStartTime(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Start time" />
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
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Select
                  value={endTime}
                  onValueChange={(v) => v && setEndTime(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="End time" />
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

              {/* Building Filter */}
              <div className="space-y-1.5">
                <Label>
                  <Building2 className="inline h-3.5 w-3.5 mr-1" />
                  Building
                </Label>
                <Select
                  value={buildingId}
                  onValueChange={(v) => v && setBuildingId(v)}
                  disabled={
                    user.role === "admin" && availableBuildings.length <= 1
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All buildings" />
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
              </div>

              {/* Min Capacity */}
              <div className="space-y-1.5">
                <Label htmlFor="min-capacity">
                  <Users className="inline h-3.5 w-3.5 mr-1" />
                  Min Capacity
                </Label>
                <Input
                  id="min-capacity"
                  type="number"
                  min={1}
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  placeholder="Any"
                />
              </div>
            </div>

            {/* Amenities */}
            <div className="mt-4 space-y-1.5">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedAmenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <span className="capitalize text-slate-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Search Button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Search className="mr-1.5 h-4 w-4" />
                {searching ? "Searching..." : "Search Available Rooms"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results !== null && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {results.length > 0
                  ? `${results.length} Available Room${results.length !== 1 ? "s" : ""}`
                  : "No Rooms Available"}
              </h2>
              <span className="text-sm text-slate-500">
                {date} &middot; {startTime} - {endTime}
              </span>
            </div>

            {results.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    No rooms match your criteria for this time slot.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try adjusting the date, time, or filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((room) => (
                  <Card key={room.id} className="transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base">{room.name}</CardTitle>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        {room.buildingName}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        Capacity: {room.capacity}
                      </div>
                      {room.amenities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {room.amenities.map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
