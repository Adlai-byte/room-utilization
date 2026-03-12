"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { Booking } from "@/lib/types";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Check, X, Clock, FileText, Inbox } from "lucide-react";

interface PendingBooking extends Booking {
  roomName: string;
  buildingName: string;
}

export default function RequestsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<PendingBooking[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings/approve");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else if (res.status === 403) {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to fetch booking requests");
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleApprove = async (bookingId: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/bookings/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action: "approve" }),
      });

      if (res.ok) {
        toast.success("Booking approved successfully");
        fetchRequests();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to approve booking");
      }
    } catch {
      toast.error("An error occurred while approving the booking");
    } finally {
      setProcessing(false);
      setApproveTarget(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/bookings/approve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          action: "reject",
          rejectionNote: rejectionNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Booking rejected");
        fetchRequests();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to reject booking");
      }
    } catch {
      toast.error("An error occurred while rejecting the booking");
    } finally {
      setProcessing(false);
      setRejectTarget(null);
      setRejectionNote("");
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      <div className="mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900">
              Booking Requests
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === "super_admin"
              ? "Review and manage booking requests across all buildings"
              : "Review and manage booking requests in your department"}
          </p>
        </div>

        {/* Pending count badge */}
        {requests.length > 0 && (
          <div className="mb-4">
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
              <Clock className="mr-1 h-3 w-3" />
              {requests.length} pending request{requests.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}

        {/* Requests table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Title</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-16"
                  >
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Inbox className="h-10 w-10" />
                      <p className="text-sm font-medium">No pending requests</p>
                      <p className="text-xs">
                        All booking requests have been processed
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium text-slate-900">
                      {request.title}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {request.roomName}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {request.buildingName}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {request.instructor}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {request.date}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {request.startTime} - {request.endTime}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {request.requestedBy || "-"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {formatDateTime(request.requestedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => setApproveTarget(request.id)}
                          disabled={processing}
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => setRejectTarget(request.id)}
                          disabled={processing}
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
        title="Approve Booking"
        description="Are you sure you want to approve this booking request? The requestor will be notified."
        confirmLabel="Approve"
        variant="default"
        onConfirm={() => {
          if (approveTarget) handleApprove(approveTarget);
        }}
      />

      {/* Reject dialog with note */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Provide an optional reason for rejecting this booking request. The
              requestor will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label
              htmlFor="rejection-note"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Rejection Note (optional)
            </label>
            <Input
              id="rejection-note"
              placeholder="Enter reason for rejection..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectionNote("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (rejectTarget) handleReject(rejectTarget);
              }}
              disabled={processing}
            >
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
