"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { Semester, Booking } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Pencil, Trash2, Upload, GraduationCap, Calendar } from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export default function SemestersPage() {
  const { user } = useAuth();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Create/Edit dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | undefined>(undefined);
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null);
  const [deleteClearBookings, setDeleteClearBookings] = useState(false);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importSemesterId, setImportSemesterId] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchSemesters = useCallback(async () => {
    try {
      const res = await fetch("/api/semesters");
      if (res.ok) {
        const data = await res.json();
        setSemesters(data);
      }
    } catch {
      toast.error("Failed to fetch semesters");
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch {
      // Bookings fetch is supplementary; don't show error toast
    }
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([fetchSemesters(), fetchBookings()]).finally(() => {
        setLoadingData(false);
      });
    }
  }, [user, fetchSemesters, fetchBookings]);

  const getBookingCount = (semesterId: string) => {
    return bookings.filter((b) => b.semesterId === semesterId).length;
  };

  const getStatusBadgeClass = (status: Semester["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "ended":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "";
    }
  };

  // Create/Edit handlers
  const handleAddSemester = () => {
    setEditingSemester(undefined);
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormOpen(true);
  };

  const handleEditSemester = (semester: Semester) => {
    setEditingSemester(semester);
    setFormName(semester.name);
    setFormStartDate(semester.startDate);
    setFormEndDate(semester.endDate);
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Semester name is required");
      return;
    }
    if (!formStartDate || !formEndDate) {
      toast.error("Start date and end date are required");
      return;
    }
    if (formEndDate <= formStartDate) {
      toast.error("End date must be after start date");
      return;
    }

    setFormSaving(true);
    try {
      if (editingSemester) {
        const res = await fetch("/api/semesters", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingSemester.id,
            name: formName,
            startDate: formStartDate,
            endDate: formEndDate,
          }),
        });
        if (res.ok) {
          toast.success("Semester updated successfully");
          setFormOpen(false);
          fetchSemesters();
        } else {
          const data = await res.json().catch(() => null);
          toast.error(data?.error || "Failed to update semester");
        }
      } else {
        const res = await fetch("/api/semesters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            startDate: formStartDate,
            endDate: formEndDate,
          }),
        });
        if (res.ok) {
          toast.success("Semester created successfully");
          setFormOpen(false);
          fetchSemesters();
        } else {
          const data = await res.json().catch(() => null);
          toast.error(data?.error || "Failed to create semester");
        }
      }
    } catch {
      toast.error("An error occurred while saving the semester");
    } finally {
      setFormSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteSemester = async () => {
    if (!deleteTarget) return;

    try {
      const params = new URLSearchParams({ id: deleteTarget.id });
      if (deleteClearBookings) {
        params.set("clearBookings", "true");
      }
      const res = await fetch(`/api/semesters?${params.toString()}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Semester deleted successfully");
        fetchSemesters();
        fetchBookings();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to delete semester");
      }
    } catch {
      toast.error("An error occurred while deleting the semester");
    } finally {
      setDeleteTarget(null);
      setDeleteClearBookings(false);
    }
  };

  // Import handlers
  const handleOpenImport = () => {
    setImportFile(null);
    setImportSemesterId("");
    setImportResult(null);
    setImportOpen(true);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a CSV file");
      return;
    }
    if (!importSemesterId) {
      toast.error("Please select a semester");
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("semesterId", importSemesterId);

      const res = await fetch("/api/semesters/import", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data: ImportResult = await res.json();
        setImportResult(data);
        if (data.imported > 0) {
          toast.success(`Imported ${data.imported} bookings`);
          fetchBookings();
        }
        if (data.skipped > 0) {
          toast.warning(`${data.skipped} rows skipped`);
        }
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to import CSV");
      }
    } catch {
      toast.error("An error occurred during import");
    } finally {
      setImportLoading(false);
    }
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-orange-500" />
              Semesters
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage academic semesters and import schedules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleOpenImport}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={handleAddSemester} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
              Add Semester
            </Button>
          </div>
        </div>

        {/* Semesters grid */}
        {semesters.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No semesters yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create your first semester to get started with schedule management.
            </p>
            <Button
              onClick={handleAddSemester}
              className="mt-4 bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Semester
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {semesters.map((semester) => {
              const bookingCount = getBookingCount(semester.id);
              return (
                <Card key={semester.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-slate-900">{semester.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClass(semester.status)}
                      >
                        {semester.status.charAt(0).toUpperCase() + semester.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{semester.startDate} to {semester.endDate}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">{bookingCount}</span> booking{bookingCount !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditSemester(semester)}
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setDeleteTarget(semester);
                            setDeleteClearBookings(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {/* Create/Edit Semester Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSemester(undefined);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSemester ? "Edit Semester" : "Create Semester"}
            </DialogTitle>
            <DialogDescription>
              {editingSemester
                ? "Update the semester details below."
                : "Fill in the details to create a new semester."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="semester-name">Name</Label>
              <Input
                id="semester-name"
                placeholder="e.g. 1st Semester 2025-2026"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester-start">Start Date</Label>
              <Input
                id="semester-start"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester-end">End Date</Label>
              <Input
                id="semester-end"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formSaving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {formSaving
                ? "Saving..."
                : editingSemester
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Semester Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteClearBookings(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Semester</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteClearBookings}
                onChange={(e) => setDeleteClearBookings(e.target.checked)}
                className="rounded border-slate-300"
              />
              Also delete all bookings associated with this semester
              {deleteTarget && (
                <span className="text-slate-500">
                  ({getBookingCount(deleteTarget.id)} booking{getBookingCount(deleteTarget.id) !== 1 ? "s" : ""})
                </span>
              )}
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteClearBookings(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSemester}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportFile(null);
            setImportSemesterId("");
            setImportResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Schedule from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with columns: title, roomId, instructor, type, date, startTime, endTime, days, until
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="import-semester">Semester</Label>
              <Select value={importSemesterId} onValueChange={(v) => v && setImportSemesterId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id}>
                      {semester.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-file">CSV File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportResult(null);
                }}
              />
            </div>
            {importResult && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-700 font-medium">
                    Imported: {importResult.imported}
                  </span>
                  <span className="text-orange-700 font-medium">
                    Skipped: {importResult.skipped}
                  </span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-slate-700 mb-1">Errors:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((err, idx) => (
                        <p key={idx} className="text-xs text-red-600">
                          Row {err.row}: {err.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
            >
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={importLoading || !importFile || !importSemesterId}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {importLoading ? "Importing..." : "Import"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
