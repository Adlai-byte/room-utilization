"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/lib/auth";
import { ActivityLogEntry } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
} from "lucide-react";

interface ActivityLogResponse {
  entries: ActivityLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

function getActionBadgeClass(action: ActivityLogEntry["action"]) {
  switch (action) {
    case "create":
      return "bg-green-100 text-green-700 border-green-200";
    case "update":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "delete":
      return "bg-red-100 text-red-700 border-red-200";
    case "approve":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "reject":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "import":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "maintenance":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityLogSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-full rounded-lg bg-slate-100" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export default function ActivityLogPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ActivityLogResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchActivityLog = useCallback(async () => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (actionFilter !== "all") {
        params.set("action", actionFilter);
      }
      if (entityFilter !== "all") {
        params.set("entity", entityFilter);
      }

      const res = await fetch(`/api/activity-log?${params.toString()}`);
      if (res.ok) {
        const json: ActivityLogResponse = await res.json();

        // Client-side date range filtering
        if (startDate || endDate) {
          const start = startDate ? new Date(startDate + "T00:00:00") : null;
          const end = endDate ? new Date(endDate + "T23:59:59") : null;

          json.entries = json.entries.filter((entry) => {
            const entryDate = new Date(entry.timestamp);
            if (start && entryDate < start) return false;
            if (end && entryDate > end) return false;
            return true;
          });
          json.total = json.entries.length;
        }

        setData(json);
      } else {
        toast.error("Failed to fetch activity log");
      }
    } catch {
      toast.error("An error occurred while fetching the activity log");
    } finally {
      setLoadingData(false);
    }
  }, [page, actionFilter, entityFilter, startDate, endDate]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchActivityLog();
    }
  }, [user, loading, router, fetchActivityLog]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, startDate, endDate]);

  if (loading || (loadingData && !data)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Activity Log
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Loading activity log...
            </p>
          </div>
          <ActivityLogSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Activity Log
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {user?.role === "super_admin"
                ? "Track all system activity across all buildings"
                : user?.role === "admin"
                  ? "Track activity in your department"
                  : "View your activity history"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ClipboardList className="h-4 w-4" />
            <span>{data?.total ?? 0} total entries</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </div>

          <Select
            value={actionFilter}
            onValueChange={(v) => v && setActionFilter(v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="reject">Reject</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={entityFilter}
            onValueChange={(v) => v && setEntityFilter(v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="room">Room</SelectItem>
              <SelectItem value="building">Building</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
              placeholder="Start date"
            />
            <span className="text-sm text-slate-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
              placeholder="End date"
            />
          </div>

          {(actionFilter !== "all" || entityFilter !== "all" || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActionFilter("all");
                setEntityFilter("all");
                setStartDate("");
                setEndDate("");
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Activity log table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data || data.entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardList className="h-10 w-10 text-slate-300" />
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          No activity found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {actionFilter !== "all" || entityFilter !== "all" || startDate || endDate
                            ? "Try adjusting your filters to see more results."
                            : "Activity will appear here as actions are performed in the system."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-slate-600">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {entry.userName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getActionBadgeClass(entry.action)}
                      >
                        {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {entry.entity.charAt(0).toUpperCase() + entry.entity.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-slate-600">
                      {entry.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {data.page} of {data.totalPages} ({data.total} entries)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
