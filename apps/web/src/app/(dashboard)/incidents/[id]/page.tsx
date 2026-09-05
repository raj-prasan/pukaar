"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  History,
  Layers,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "../../../../../../../packages/backend/convex/_generated/api";
import type { Id } from "../../../../../../../packages/backend/convex/_generated/dataModel";

const label = (value: string) => value.replaceAll("_", " ");
const dateTime = (value: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params?.id as Id<"incidents"> | undefined;

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyTargetStatus, setVerifyTargetStatus] = useState<"verified" | "outdated">("verified");
  const [verifyNote, setVerifyNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const incidentData = useQuery(
    api.private.incidents.getIncidentDetails,
    incidentId ? { incidentId } : "skip",
  );

  const verifyIncident = useMutation(api.private.incidents.verifyIncident);

  if (!incidentId || incidentData === undefined) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading incident details...
      </div>
    );
  }

  if (incidentData === null) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Incident Not Found</h2>
        <Button onClick={() => router.back()} className="mt-4 gap-2">
          <ArrowLeft className="size-4" /> Go Back
        </Button>
      </div>
    );
  }

  const { incident, reports, verifications } = incidentData;

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyIncident({
        incidentId,
        status: verifyTargetStatus,
        note: verifyNote.trim() || undefined,
      });
      setNotice(`Incident status updated to ${verifyTargetStatus.toUpperCase()} and history logged.`);
      setVerifyModalOpen(false);
      setVerifyNote("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-background text-foreground overflow-y-auto">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="size-4" /> Back to Incidents
          </button>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge
                  className={`uppercase text-xs font-bold ${
                    incident.priority === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : incident.priority === "high"
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  Priority: {incident.priority}
                </Badge>
                <Badge
                  variant={
                    incident.verificationStatus === "verified"
                      ? "default"
                      : incident.verificationStatus === "outdated"
                        ? "destructive"
                        : "outline"
                  }
                  className="uppercase text-xs font-bold"
                >
                  Status: {incident.verificationStatus}
                </Badge>
                <Badge variant="secondary" className="uppercase text-xs font-bold">
                  {label(incident.category)}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {incident.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={busy}
                onClick={() => {
                  setVerifyTargetStatus("verified");
                  setVerifyModalOpen(true);
                }}
                className="gap-2"
              >
                <CheckCircle className="size-4" /> Verify Incident
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setVerifyTargetStatus("outdated");
                  setVerifyModalOpen(true);
                }}
                className="gap-2"
              >
                <Clock className="size-4" /> Mark Outdated
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {notice && (
          <Alert variant="success">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <Card className="lg:col-span-2 p-6 rounded-none space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">
                Overview & Description
              </h3>
              <p className="text-base leading-7 text-muted-foreground whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-none space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Location & Coordinates
              </h4>
              <div className="text-sm space-y-1">
                {incident.address && (
                  <p className="font-semibold text-foreground">{incident.address}</p>
                )}
                <p className="font-mono text-xs text-muted-foreground">
                  GPS: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Corroborating Reports Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Crowdsourced Corroboration Reports ({reports.length})
                </h3>
                <Badge variant="secondary" className="font-bold">
                  {incident.reportCount} Corroborating Submissions
                </Badge>
              </div>

              {reports.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {reports.map((rep) => (
                    <div key={rep._id} className="p-4 bg-card border border-border space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{rep.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {dateTime(rep.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {rep.description}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                        {rep.severity && (
                          <span className="font-semibold uppercase">
                            Severity: {rep.severity}
                          </span>
                        )}
                        {rep.locationAccuracy !== undefined && (
                          <span>GPS Acc: ~{Math.round(rep.locationAccuracy)}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No individual field reports attached directly to this incident.
                </p>
              )}
            </div>
          </Card>

          {/* Audit History & Meta Side Panel */}
          <div className="space-y-6">
            <Card className="p-6 rounded-none space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <History className="size-4" />
                Verification Audit History
              </h3>

              {verifications.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {verifications.map((vRec) => (
                    <div key={vRec._id} className="relative pl-7 space-y-1">
                      <span className="absolute left-1.5 top-1 size-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold uppercase text-primary">
                          {vRec.status}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {dateTime(vRec.createdAt)}
                        </span>
                      </div>
                      {vRec.note && (
                        <p className="text-xs text-foreground bg-muted/40 p-2 border border-border">
                          "{vRec.note}"
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User className="size-3" /> Logged by: {vRec.verifierName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No verification history recorded yet.
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* Verification Modal */}
        <Sheet open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                {verifyTargetStatus === "verified" ? "Verify Incident" : "Mark Incident Outdated"}
              </SheetTitle>
              <SheetDescription>
                Record an official verification note. This creates an immutable audit trail entry.
              </SheetDescription>
            </SheetHeader>
            <form id="verify-modal-form" onSubmit={handleVerifySubmit} className="space-y-4 px-4 py-3">
              <label className="block space-y-1 text-sm font-semibold">
                Verification Note / Evidence
                <Textarea
                  rows={4}
                  placeholder={
                    verifyTargetStatus === "verified"
                      ? "Confirmed by field volunteer on ground."
                      : "No active flooding observed during latest check."
                  }
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                />
              </label>
            </form>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button form="verify-modal-form" type="submit" disabled={busy}>
                {busy ? "Submitting..." : "Submit Verification"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
