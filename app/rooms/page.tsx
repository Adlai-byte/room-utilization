"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { Building, Room } from "@/lib/types";
import { RoomForm } from "@/components/rooms/room-form";
import { toast } from "sonner";
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
import { Plus, Pencil, Trash2, Search, Building2, Wrench } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MaintenanceDialog } from "@/components/rooms/maintenance-dialog";

export default function RoomsPage() {
  const { user, loading } = useAuth();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>(undefined);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [maintenanceRoom, setMaintenanceRoom] = useState<Room | null>(null);

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

  const fetchRooms = useCallback(
    async (buildingId?: string) => {
      try {
        const params = new URLSearchParams();
        if (buildingId && buildingId !== "all") {
          params.set("buildingId", buildingId);
        }
        const res = await fetch(`/api/rooms?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
        }
      } catch {
        toast.error("Failed to fetch rooms");
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      fetchBuildings();
      // Admin users see only their building's rooms
      if (user.role === "admin" && user.department) {
        fetchRooms();
      } else {
        fetchRooms();
      }
    }
  }, [user, loading, fetchBuildings, fetchRooms]);

  // Filter rooms based on building and search
  useEffect(() => {
    let result = rooms;

    // Admin: filter to their department's building
    if (user?.role === "admin" && user.department) {
      const adminBuildings = buildings
        .filter((b) => b.code === user.department)
        .map((b) => b.id);
      result = result.filter((r) => adminBuildings.includes(r.buildingId));
    }

    // Filter by selected building
    if (selectedBuildingId !== "all") {
      result = result.filter((r) => r.buildingId === selectedBuildingId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(query));
    }

    setFilteredRooms(result);
  }, [rooms, selectedBuildingId, searchQuery, user, buildings]);

  const handleSaveRoom = async (roomData: Partial<Room>) => {
    try {
      if (editingRoom) {
        const res = await fetch("/api/rooms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingRoom.id, ...roomData }),
        });
        if (res.ok) {
          toast.success("Room updated successfully");
          fetchRooms();
        } else {
          toast.error("Failed to update room");
        }
      } else {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roomData),
        });
        if (res.ok) {
          toast.success("Room created successfully");
          fetchRooms();
        } else {
          toast.error("Failed to create room");
        }
      }
      setFormOpen(false);
      setEditingRoom(undefined);
    } catch {
      toast.error("An error occurred while saving the room");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms?id=${roomId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Room deleted successfully");
        fetchRooms();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to delete room");
      }
    } catch {
      toast.error("An error occurred while deleting the room");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setFormOpen(true);
  };

  const handleAddRoom = () => {
    setEditingRoom(undefined);
    setFormOpen(true);
  };

  const handleScheduleMaintenance = async (roomId: string, maintenance: { scheduledStart: string; scheduledEnd: string; reason: string }) => {
    try {
      const res = await fetch("/api/rooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId, status: "maintenance", maintenance }),
      });
      if (res.ok) {
        toast.success("Maintenance scheduled");
        fetchRooms();
      } else {
        toast.error("Failed to schedule maintenance");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleClearMaintenance = async (roomId: string) => {
    try {
      const res = await fetch("/api/rooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId, status: "active", maintenance: null }),
      });
      if (res.ok) {
        toast.success("Maintenance ended, room is now active");
        fetchRooms();
      } else {
        toast.error("Failed to end maintenance");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find((b) => b.id === buildingId);
    return building ? building.name : "Unknown";
  };

  const getStatusBadgeVariant = (status: Room["status"]) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "maintenance":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Determine which buildings to show in filter
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
            <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.role === "super_admin"
                ? "Manage rooms across all buildings"
                : "View rooms in your department"}
            </p>
          </div>
          {user?.role === "super_admin" && (
            <Button onClick={handleAddRoom} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedBuildingId} onValueChange={(v) => v && setSelectedBuildingId(v)}>
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
        </div>

        {/* Rooms table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Amenities</TableHead>
                <TableHead>Status</TableHead>
                {user?.role === "super_admin" && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={user?.role === "super_admin" ? 6 : 5}
                    className="text-center py-8 text-slate-500"
                  >
                    No rooms found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium text-slate-900">
                      {room.name}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {getBuildingName(room.buildingId)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {room.capacity}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.map((amenity) => (
                          <Badge
                            key={amenity}
                            variant="secondary"
                            className="text-xs"
                          >
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(room.status)}>
                        {room.status.charAt(0).toUpperCase() +
                          room.status.slice(1)}
                      </Badge>
                    </TableCell>
                    {user?.role === "super_admin" && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setMaintenanceRoom(room)}
                            title="Maintenance"
                          >
                            <Wrench className={`h-4 w-4 ${room.status === "maintenance" ? "text-yellow-600" : "text-slate-400"}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEditRoom(room)}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(room.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      {/* Room form dialog */}
      <RoomForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRoom(undefined);
        }}
        buildings={buildings}
        room={editingRoom}
        onSave={handleSaveRoom}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Room"
        description="Are you sure you want to delete this room? All bookings associated with this room will also be removed. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteTarget) handleDeleteRoom(deleteTarget); }}
      />

      {/* Maintenance dialog */}
      <MaintenanceDialog
        open={!!maintenanceRoom}
        onOpenChange={(open) => { if (!open) setMaintenanceRoom(null); }}
        room={maintenanceRoom}
        onSchedule={handleScheduleMaintenance}
        onClear={handleClearMaintenance}
      />
    </AppShell>
  );
}
