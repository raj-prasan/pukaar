"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  GitMerge,
  Layers,
  MapPin,
  Plus,
  Radio,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc } from "../../../../../../packages/backend/convex/_generated/dataModel";

type Report = Doc<"reports">;
type Priority = "low" | "medium" | "high" | "critical";

const priorities: Priority[] = ["low", "medium", "high", "critical"];

const label = (value: string) => value.replaceAll("_", " ");
const time = (value: number) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    value,
  );

function PendingReportCard({
  report,
  onNotice,
}: {
  report: Report;
  onNotice: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(report.title);
  const [newDescription, setNewDescription] = useState(report.description);
  const [priority, setPriority] = useState<Priority>(
    report.severity === "critical"
      ? "critical"
      : report.severity === "high"
        ? "high"
        : "medium",
  );

  // Search nearby active incidents matching category and coordinates
  const nearbyIncidents = useQuery(api.private.incidents.findNearbyIncidents, {
    category: report.category,
    latitude: report.latitude,
    longitude: report.longitude,
    reportId: report._id,
    maxDistanceKm: 0.5,
  });

  const attachReport = useMutation(api.private.incidents.attachReportToIncident);
  const createIncidentFromReport = useMutation(
    api.private.incidents.createIncidentFromReport,
  );
  const verifyReport = useMutation(api.private.reports.verifyReport);

  const handleMerge = async (incidentId: any, incidentTitle: string) => {
    setBusy(true);
    try {
      await attachReport(
        {
          reportId: report._id,
          incidentId,
        },
      );
      onNotice(`Report attached to Incident "${incidentTitle}". Report count incremented.`);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to merge report");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createIncidentFromReport({
        reportId: report._id,
        title: newTitle,
        description: newDescription,
        priority,
      });
      setCreateModalOpen(false);
      onNotice(`New Incident created from report and added to response board.`);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await verifyReport({
        reportId: report._id,
        status: "rejected",
      });
      onNotice("Report rejected.");
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Failed to reject report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-none border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Report Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs rounded-none uppercase tracking-wider">
              {label(report.category)}
            </Badge>
            {report.severity && (
              <Badge variant="outline" className="text-xs uppercase rounded-none tracking-wider font-semibold">
                Reporter Severity: {label(report.severity)}
              </Badge>
            )}
          </div>
          <h3 className="mt-2 text-lg font-bold text-foreground">{report.title}</h3>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {time(report.createdAt)}
        </span>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{report.description}</p>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground ">
        <span className="flex items-center gap-1.5 font-mono">
          <MapPin className="size-3.5 text-primary" />
          {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
        </span>
        {report.address && (
          <span className="truncate max-w-[250px]">{report.address}</span>
        )}
        {report.locationAccuracy !== undefined && (
          <span className="text-muted-foreground">
            Accuracy: ~{Math.round(report.locationAccuracy)}m
          </span>
        )}
      </div>

      {/* Duplicate Matching Section */}
      <div className="mt-4 rounded-none border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Layers className="size-4 text-primary" />
            Potential Duplicate Incidents ({nearbyIncidents?.length ?? 0})
          </div>
        </div>

        {nearbyIncidents && nearbyIncidents.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Matching incidents found in <strong className="capitalize">{label(report.category)}</strong> nearby. Merge if this report corroborates an ongoing incident:
            </p>
            {nearbyIncidents.map((incident) => (
              <div
                key={incident._id}
                className="flex items-center justify-between gap-3  bg-card p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{incident.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {incident.distanceKm.toFixed(1)} km away
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {incident.reportCount} {incident.reportCount === 1 ? "report" : "reports"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {incident.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleMerge(incident._id, incident.title)}
                  className="gap-1.5 text-xs h-8 whitespace-nowrap"
                >
                  <GitMerge className="size-3.5 text-primary" /> Merge report
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No nearby active incidents found in this category.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => setCreateModalOpen(true)}
          className="gap-1.5"
        >
          <Plus className="size-4" /> Create New Incident
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => void handleReject()}
          className="gap-1.5"
        >
          <X className="size-4" /> Reject Report
        </Button>
      </div>

      {/* Modal to promote report to new Incident */}
      <Sheet open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Incident from Report</SheetTitle>
            <SheetDescription>
              Promote this field report to an active incident on the response board.
            </SheetDescription>
          </SheetHeader>
          <form id={`create-incident-${report._id}`} onSubmit={handleCreateNew} className="space-y-4 px-4 py-2">
            <label className="block space-y-1 text-sm font-semibold">
              Incident Title
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm font-semibold">
              Description
              <Textarea
                required
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm font-semibold">
              Operational Priority
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </Select>
            </label>
          </form>
          <SheetFooter>
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button form={`create-incident-${report._id}`} type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create Incident"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ReportsPageView() {
  const [notice, setNotice] = useState<string | null>(null);
  const reports = useQuery(api.private.reports.getPendingReports);

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="size-2 rounded-none bg-primary" />
              Verification desk
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Reports review & corroboration
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review incoming crowdsourced reports, detect nearby duplicate incidents, and merge or promote reports to official response incidents.
            </p>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <Radio className="size-3.5 text-primary" />
            Live data
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {notice && (
          <Alert variant="success" className="flex items-center justify-between gap-3">
            <AlertDescription>{notice}</AlertDescription>
            <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
              <X className="size-4" />
            </button>
          </Alert>
        )}

        <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Pending queue
              </span>
              <h2 className="mt-1 text-xl font-semibold">
                Reports awaiting coordinator review ({reports?.length ?? 0})
              </h2>
            </div>
            <ClipboardCheck className="size-5 text-primary" />
          </div>

          {reports?.length ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <PendingReportCard
                  key={report._id}
                  report={report}
                  onNotice={(msg) => setNotice(msg)}
                />
              ))}
            </div>
          ) : (
            <EmptyState label="All field reports have been reviewed" />
          )}
        </Card>
      </main>
    </div>
  );
}
