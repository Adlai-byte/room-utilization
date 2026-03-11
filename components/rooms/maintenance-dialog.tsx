"use client";

import { useState } from "react";
import { Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wrench } from "lucide-react";

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  onSchedule: (roomId: string, maintenance: { scheduledStart: string; scheduledEnd: string; reason: string }) => void;
  onClear: (roomId: string) => void;
}

export function MaintenanceDialog({
  open,
  onOpenChange,
  room,
  onSchedule,
  onClear,
}: MaintenanceDialogProps) {
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [reason, setReason] = useState("");

  const hasMaintenance = room?.maintenance && room?.status === "maintenance";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    onSchedule(room.id, { scheduledStart, scheduledEnd, reason });
    onOpenChange(false);
  };

  const handleClear = () => {
    if (!room) return;
    onClear(room.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            {hasMaintenance ? "Maintenance Scheduled" : "Schedule Maintenance"}
          </DialogTitle>
          <DialogDescription>
            {room ? `${room.name}` : "Select a room"}
            {hasMaintenance
              ? " — Currently under maintenance"
              : " — Set maintenance window to block bookings"}
          </DialogDescription>
        </DialogHeader>

        {hasMaintenance && room?.maintenance ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium text-yellow-800">Period:</span>{" "}
                <span className="text-yellow-700">
                  {room.maintenance.scheduledStart} to {room.maintenance.scheduledEnd}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-yellow-800">Reason:</span>{" "}
                <span className="text-yellow-700">{room.maintenance.reason}</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleClear}
              >
                End Maintenance
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="maint-start">Start Date</Label>
                <Input
                  id="maint-start"
                  type="date"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maint-end">End Date</Label>
                <Input
                  id="maint-end"
                  type="date"
                  value={scheduledEnd}
                  min={scheduledStart}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maint-reason">Reason</Label>
              <Textarea
                id="maint-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., HVAC repair, renovation, deep cleaning..."
                required
              />
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
                Schedule Maintenance
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
