"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  History,
  ImageIcon,
  Layers,
  MapPin,
  Maximize2,
  Phone,
  Send,
  ShieldCheck,
  User,
  Users,
  X,
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
import { Select } from "@/components/ui/select";
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
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
    date: number;
    description?: string;
  } | null>(null);

  // Task & Dispatch modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskCategory, setTaskCategory] = useState<
    "rescue" | "medical" | "evacuation" | "food" | "water" | "shelter" | "medicine" | "other"
  >("rescue");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "critical">("high");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>("");
  const [taskInstructions, setTaskInstructions] = useState("");

  // Inline dispatch for existing unassigned task
  const [inlineDispatchModalOpen, setInlineDispatchModalOpen] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState<Id<"assistanceRequests"> | null>(null);
  const [inlineVolunteerId, setInlineVolunteerId] = useState("");
  const [inlineInstructions, setInlineInstructions] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImage(null);
      }
    };
    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImage]);

  const incidentData = useQuery(
    api.private.incidents.getIncidentDetails,
    incidentId ? { incidentId } : "skip",
  );

  const volunteers = useQuery(api.private.users.volunteersUnderCoordinatorCamp);

  const verifyIncident = useMutation(api.private.incidents.verifyIncident);
  const createTaskAndDispatch = useMutation(api.private.dispatches.createTaskAndDispatch);
  const dispatchVolunteer = useMutation(api.private.dispatches.dispatchVolunteer);

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

  const { incident, reports, verifications, tasks = [] } = incidentData;
  const reportsWithImages = reports.filter(
    (rep): rep is typeof rep & { imageUrl: string } => Boolean(rep.imageUrl)
  );

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

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) {
      setNotice("Please provide a task description");
      return;
    }
    if (!incidentId) return;

    setBusy(true);
    try {
      await createTaskAndDispatch({
        incidentId,
        category: taskCategory,
        priority: taskPriority,
        description: taskDescription.trim(),
        volunteerId: selectedVolunteerId ? (selectedVolunteerId as Id<"users">) : undefined,
        instructions: taskInstructions.trim() || undefined,
      });

      const assignedVol = volunteers?.find((v) => v._id === selectedVolunteerId);
      setNotice(
        assignedVol
          ? `Task assigned and dispatched to ${assignedVol.name}!`
          : "Task successfully created for this incident!",
      );
      setTaskModalOpen(false);
      setTaskDescription("");
      setTaskInstructions("");
      setSelectedVolunteerId("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to assign task");
    } finally {
      setBusy(false);
    }
  };

  const handleInlineDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTaskId || !inlineVolunteerId) {
      setNotice("Please select a volunteer to dispatch");
      return;
    }

    setBusy(true);
    try {
      await dispatchVolunteer({
        requestId: targetTaskId,
        volunteerId: inlineVolunteerId as Id<"users">,
        instructions: inlineInstructions.trim() || undefined,
      });

      const assignedVol = volunteers?.find((v) => v._id === inlineVolunteerId);
      setNotice(`Volunteer ${assignedVol?.name ?? "assigned"} successfully dispatched!`);
      setInlineDispatchModalOpen(false);
      setTargetTaskId(null);
      setInlineVolunteerId("");
      setInlineInstructions("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to dispatch volunteer");
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
                  setTaskPriority(incident.priority);
                  setTaskModalOpen(true);
                }}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="size-4" /> Assign Task / Dispatch
              </Button>
              <Button
                disabled={busy}
                variant="outline"
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

            {/* Uploaded Photos & Visual Evidence */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  Uploaded Photos & Evidence ({reportsWithImages.length})
                </h3>
                <Badge variant={reportsWithImages.length > 0 ? "default" : "secondary"} className="font-bold">
                  {reportsWithImages.length} {reportsWithImages.length === 1 ? "Photo" : "Photos"}
                </Badge>
              </div>

              {reportsWithImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {reportsWithImages.map((rep) => (
                    <button
                      type="button"
                      key={rep._id}
                      onClick={() =>
                        setSelectedImage({
                          url: rep.imageUrl,
                          title: rep.title,
                          date: rep.createdAt,
                          description: rep.description,
                        })
                      }
                      className="group relative aspect-video w-full rounded-none border border-border bg-muted/30 overflow-hidden cursor-pointer hover:border-primary transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <img
                        src={rep.imageUrl}
                        alt={rep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                        <span className="text-xs font-semibold truncate">{rep.title}</span>
                        <span className="text-[10px] text-white/80">{dateTime(rep.createdAt)}</span>
                        <span className="text-[10px] text-primary flex items-center gap-1 mt-0.5 font-medium">
                          <Maximize2 className="size-3" /> Click to enlarge
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/20 border border-dashed border-border text-muted-foreground text-xs">
                  <ImageIcon className="size-5 text-muted-foreground/60 shrink-0" />
                  <span>No photo evidence has been uploaded for this incident yet.</span>
                </div>
              )}
            </div>

            {/* Field Tasks & Volunteer Dispatches Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <ClipboardList className="size-4 text-primary" />
                    Tasks & Volunteer Dispatches ({tasks.length})
                  </h3>
                  <Badge variant={tasks.length > 0 ? "default" : "secondary"} className="font-bold">
                    {tasks.length} {tasks.length === 1 ? "Mission" : "Missions"}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setTaskPriority(incident.priority);
                    setTaskModalOpen(true);
                  }}
                  className="gap-1.5 text-xs font-semibold h-8"
                >
                  <Send className="size-3.5" /> Assign New Task
                </Button>
              </div>

              {tasks.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {tasks.map((task) => {
                    const dispatchStatus = task.dispatch?.status;
                    return (
                      <div
                        key={task._id}
                        className="p-4 bg-card border border-border space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                {label(task.category)}
                              </Badge>
                              <Badge
                                className={`text-[10px] uppercase font-bold ${
                                  task.priority === "critical"
                                    ? "bg-destructive/10 text-destructive"
                                    : task.priority === "high"
                                      ? "bg-amber-500/15 text-amber-600"
                                      : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <Badge
                              className={`text-[10px] uppercase font-bold ${
                                dispatchStatus === "completed"
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                  : dispatchStatus === "arrived"
                                    ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                                    : dispatchStatus === "en_route"
                                      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                                      : dispatchStatus === "accepted" || dispatchStatus === "dispatched"
                                        ? "bg-primary/10 text-primary border-primary/30"
                                        : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {dispatchStatus ? label(dispatchStatus) : label(task.status)}
                            </Badge>
                          </div>

                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {task.description}
                          </p>

                          {task.dispatch?.instructions && (
                            <div className="p-2 bg-muted/40 border border-border text-[11px] text-muted-foreground italic">
                              "{task.dispatch.instructions}"
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border space-y-2">
                          {task.volunteer ? (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-foreground font-medium truncate pr-2">
                                <User className="size-3.5 text-primary shrink-0" />
                                <span className="truncate">{task.volunteer.name}</span>
                              </div>
                              {task.volunteer.phone && (
                                <a
                                  href={`tel:${task.volunteer.phone}`}
                                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
                                >
                                  <Phone className="size-3" /> {task.volunteer.phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[11px] text-muted-foreground italic">
                                Unassigned
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() => {
                                  setTargetTaskId(task._id);
                                  setInlineDispatchModalOpen(true);
                                }}
                              >
                                Dispatch Volunteer
                              </Button>
                            </div>
                          )}

                          <div className="text-[10px] text-muted-foreground flex justify-between">
                            <span>Created {dateTime(task.createdAt)}</span>
                            {task.dispatch?.dispatchedAt && (
                              <span>Dispatched {dateTime(task.dispatch.dispatchedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-muted/20 border border-dashed border-border text-center space-y-3">
                  <ClipboardList className="size-8 text-muted-foreground/50 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      No Tasks Dispatched Yet
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Assign field operations, rescue missions, or relief supply runs directly to your camp volunteers for this incident.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setTaskPriority(incident.priority);
                      setTaskModalOpen(true);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Send className="size-3.5" /> Assign First Task
                  </Button>
                </div>
              )}
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
                    <div key={rep._id} className="p-4 bg-card border border-border space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        {rep.imageUrl && (
                          <div
                            onClick={() =>
                              setSelectedImage({
                                url: rep.imageUrl!,
                                title: rep.title,
                                date: rep.createdAt,
                                description: rep.description,
                              })
                            }
                            className="relative aspect-video w-full overflow-hidden border border-border bg-muted/40 cursor-pointer group mb-2"
                            title="Click to view full photo"
                          >
                            <img
                              src={rep.imageUrl}
                              alt={rep.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded backdrop-blur text-[10px] flex items-center gap-1 opacity-90 group-hover:opacity-100">
                              <Maximize2 className="size-3" />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-sm">{rep.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {dateTime(rep.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {rep.description}
                        </p>
                      </div>
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

        {/* Assign Task / Dispatch Volunteer Modal */}
        <Sheet open={taskModalOpen} onOpenChange={setTaskModalOpen}>
          <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Send className="size-5 text-primary" /> Assign Task & Dispatch Volunteer
              </SheetTitle>
              <SheetDescription>
                Create a field mission for incident "{incident.title}" and deploy an active camp volunteer.
              </SheetDescription>
            </SheetHeader>
            <form id="task-modal-form" onSubmit={handleTaskSubmit} className="space-y-4 px-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Task Category
                </label>
                <Select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                >
                  <option value="rescue">Rescue Mission</option>
                  <option value="medical">Medical Assistance</option>
                  <option value="evacuation">Evacuation Support</option>
                  <option value="food">Food Distribution</option>
                  <option value="water">Water Delivery</option>
                  <option value="shelter">Shelter Assistance</option>
                  <option value="medicine">Medicine Supply</option>
                  <option value="other">General Task / Assessment</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Priority
                </label>
                <Select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                >
                  <option value="critical">Critical Priority</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Task Description / Mission Goal *
                </label>
                <Textarea
                  required
                  rows={3}
                  placeholder="e.g., Deliver emergency water filtration kits to Sector 4 and check for trapped families."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Assign Volunteer</span>
                  <span className="text-[10px] text-muted-foreground lowercase">
                    ({volunteers?.length ?? 0} available)
                  </span>
                </label>
                <Select
                  value={selectedVolunteerId}
                  onChange={(e) => setSelectedVolunteerId(e.target.value)}
                >
                  <option value="">-- Leave Unassigned (Create Task Only) --</option>
                  {volunteers && volunteers.length > 0 ? (
                    volunteers.map((vol) => (
                      <option key={vol._id} value={vol._id}>
                        {vol.name} {vol.phone ? `(${vol.phone})` : ""}
                      </option>
                    ))
                  ) : (
                    <option disabled value="none">
                      No active volunteers registered in your camp
                    </option>
                  )}
                </Select>
                {volunteers && volunteers.length === 0 && (
                  <p className="text-[11px] text-amber-600">
                    No active volunteers under your camp yet. The task will be created as unassigned.
                  </p>
                )}
              </div>

              {selectedVolunteerId && (
                <div className="space-y-1.5 p-3 bg-muted/30 border border-border">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Specific Dispatch Instructions (Optional)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g., Meet Coordinator at Gate 2. Bring 2 heavy-duty ropes and medical kit."
                    value={taskInstructions}
                    onChange={(e) => setTaskInstructions(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    These instructions will appear immediately on the volunteer's mobile app screen.
                  </p>
                </div>
              )}
            </form>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button form="task-modal-form" type="submit" disabled={busy}>
                {busy ? "Dispatching..." : selectedVolunteerId ? "Dispatch Volunteer" : "Create Task"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Inline Dispatch Modal for Existing Unassigned Task */}
        <Sheet open={inlineDispatchModalOpen} onOpenChange={setInlineDispatchModalOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" /> Dispatch Volunteer to Task
              </SheetTitle>
              <SheetDescription>
                Select a registered volunteer from your camp to assign to this mission.
              </SheetDescription>
            </SheetHeader>
            <form id="inline-dispatch-form" onSubmit={handleInlineDispatchSubmit} className="space-y-4 px-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Volunteer *
                </label>
                <Select
                  required
                  value={inlineVolunteerId}
                  onChange={(e) => setInlineVolunteerId(e.target.value)}
                >
                  <option value="">-- Choose a Volunteer --</option>
                  {volunteers?.map((vol) => (
                    <option key={vol._id} value={vol._id}>
                      {vol.name} {vol.phone ? `(${vol.phone})` : ""}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dispatch Instructions (Optional)
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g., Report directly to the incident site and coordinate with locals."
                  value={inlineInstructions}
                  onChange={(e) => setInlineInstructions(e.target.value)}
                />
              </div>
            </form>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setInlineDispatchModalOpen(false)}>
                Cancel
              </Button>
              <Button form="inline-dispatch-form" type="submit" disabled={busy || !inlineVolunteerId}>
                {busy ? "Dispatching..." : "Confirm Dispatch"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Full Image Preview Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-4xl w-full max-h-[90vh] bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="truncate pr-4">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {selectedImage.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Uploaded on {dateTime(selectedImage.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border hover:bg-muted text-foreground transition-colors font-semibold"
                  >
                    <ExternalLink className="size-3.5" />
                    <span className="hidden sm:inline">Open Original</span>
                  </a>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Close image preview"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-black/95 flex items-center justify-center p-2 min-h-[300px] max-h-[70vh] overflow-hidden">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {selectedImage.description && (
                <div className="px-4 py-3 border-t border-border bg-card/90 text-xs text-muted-foreground">
                  <p className="line-clamp-3">{selectedImage.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
