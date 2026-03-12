"use client";

import { useState, useEffect } from "react";
import { Building, Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AMENITY_OPTIONS } from "@/lib/constants";

interface RoomFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildings: Building[];
  room?: Room;
  onSave: (room: Partial<Room>) => void;
}

export function RoomForm({
  open,
  onOpenChange,
  buildings,
  room,
  onSave,
}: RoomFormProps) {
  const [name, setName] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [capacity, setCapacity] = useState<number>(30);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [status, setStatus] = useState<Room["status"]>("active");

  // Reset form when room prop changes or dialog opens
  useEffect(() => {
    if (open) {
      if (room) {
        setName(room.name);
        setBuildingId(room.buildingId);
        setCapacity(room.capacity);
        setAmenities([...room.amenities]);
        setStatus(room.status);
      } else {
        setName("");
        setBuildingId(buildings.length > 0 ? buildings[0].id : "");
        setCapacity(30);
        setAmenities([]);
        setStatus("active");
      }
    }
  }, [open, room, buildings]);

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      buildingId,
      capacity,
      amenities,
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "Add Room"}</DialogTitle>
          <DialogDescription>
            {room
              ? "Update the room details below."
              : "Fill in the details to create a new room."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div className="space-y-1.5">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Room 101"
              required
            />
          </div>

          {/* Building */}
          <div className="space-y-1.5">
            <Label>Building</Label>
            <Select value={buildingId} onValueChange={(v) => v && setBuildingId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select a building"
                  displayValue={buildingId ? buildings.find(b => b.id === buildingId)?.name : undefined}
                />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <Label htmlFor="room-capacity">Capacity</Label>
            <Input
              id="room-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          {/* Amenities */}
          <div className="space-y-1.5">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                >
                  <Checkbox
                    checked={amenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <span className="capitalize text-slate-700">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => val && setStatus(val as Room["status"])}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select status"
                  displayValue={status ? status.charAt(0).toUpperCase() + status.slice(1) : undefined}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              {room ? "Update Room" : "Create Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
