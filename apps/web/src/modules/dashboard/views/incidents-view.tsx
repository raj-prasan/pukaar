"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  History,
  Layers,
  MapPin,
  PanelTopOpen,
  Plus,
  Radio,
  ShieldCheck,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc, Id } from "../../../../../../packages/backend/convex/_generated/dataModel";
import Link from "next/link";

type Incident = Doc<"incidents">;
type ActionRunner = (
  id: string,
  action: () => Promise<unknown>,
  message: string,
) => Promise<void>;

const categories = [
  "flood",
  "fire",
  "landslide",
  "earthquake",
  "medical",
  "road_blocked",
  "building_damage",
  "missing_person",
  "other",
] as const;
const priorities = ["low", "medium", "high", "critical"] as const;
const label = (value: string) => value.replaceAll("_", " ");
const time = (value: number) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    value,
  );
const dateTime = (value: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

export function IncidentsPageView() {
  const [selectedId, setSelectedId] = useState<Id<"incidents"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyTargetStatus, setVerifyTargetStatus] = useState<"verified" | "outdated">("verified");
  const [verifyNote, setVerifyNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "flood" as (typeof categories)[number],
    priority: "high" as (typeof priorities)[number],
    latitude: "",
    longitude: "",
    address: "",
  });

  const incidents = useQuery(api.public.incidents.getActiveIncidents);
  const selectedDetails = useQuery(
    api.private.incidents.getIncidentDetails,
    selectedId ? { incidentId: selectedId } : "skip",
  );

  const createIncident = useMutation(
    api.private.incidents.createIncidentByCoordinator,
  );
  const updateIncident = useMutation(api.private.incidents.updateIncident);
  const verifyIncident = useMutation(api.private.incidents.verifyIncident);

  const runAction: ActionRunner = async (id, action, message) => {
    setBusyId(id);
    setNotice(null);
    try {
      await action();
      setNotice(message);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The action could not be completed",
      );
    } finally {
      setBusyId(null);
    }
  };

  const selected = incidents?.find((incident) => incident._id === selectedId);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "create-incident",
      () =>
        createIncident({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          address: form.address || undefined,
        }),
      "Incident created and added to active situation board.",
    );
    setFormOpen(false);
    setForm({
      title: "",
      description: "",
      category: "flood",
      priority: "high",
      latitude: "",
      longitude: "",
      address: "",
    });
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    await runAction(
      selectedId,
      () =>
        verifyIncident({
          incidentId: selectedId,
          status: verifyTargetStatus,
          note: verifyNote.trim() || undefined,
        }),
      `Incident verification state updated to ${verifyTargetStatus.toUpperCase()} and history logged.`,
    );
    setVerifyModalOpen(false);
    setVerifyNote("");
  };

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="size-2 rounded-full bg-destructive" />
              Situation board
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Incident desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Track, corroborate, verify, and resolve active response incidents.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
              <Radio className="size-3.5 text-primary" />
              Live data
            </span>
            <Button
              onClick={() => setFormOpen(true)}
              className="h-10 gap-2 rounded-none px-4"
            >
              <Plus className="size-4" />
              New incident
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {notice && (
          <Alert
            variant="success"
            className="flex items-center justify-between gap-3"
          >
            <AlertDescription>{notice}</AlertDescription>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <X className="size-4" />
            </button>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* Incident List */}
          <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
            {incidents?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {incidents.map((incident) => (
                  <button
                    key={incident._id}
                    onClick={() => setSelectedId(incident._id)}
                    className={`rounded-none border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedId === incident._id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Badge
                          className={`border-transparent text-[10px] uppercase font-bold ${incident.priority === "critical" ? "bg-destructive/10 text-destructive" : incident.priority === "high" ? "bg-amber-500/15 text-amber-600" : "bg-secondary text-secondary-foreground"}`}
                        >
                          {incident.priority}
                        </Badge>
                        <Badge
                          variant={incident.verificationStatus === "verified" ? "default" : incident.verificationStatus === "outdated" ? "destructive" : "outline"}
                          className="text-[10px] uppercase font-semibold"
                        >
                          {incident.verificationStatus}
                        </Badge>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>

                    <h3 className="mt-3 font-semibold text-foreground">{incident.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {incident.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                      <span className="font-semibold text-primary">
                        {incident.reportCount} {incident.reportCount === 1 ? "report" : "reports"}
                      </span>
                      <span>{time(incident.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState label="No active incidents" />
            )}
          </Card>

          {/* Selected Incident Detail Panel */}
          <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6 space-y-5">
            {selected ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                      Incident Inspection
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-foreground">
                      {selected.title}
                    </h2>
                  </div>
                  <button
                    aria-label="Close incident detail"
                    onClick={() => setSelectedId(null)}
                    className="rounded-none p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  {selected.description}
                </p>

                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-none bg-muted/40 p-2.5 border border-border">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="mt-0.5 font-semibold capitalize text-foreground">
                      {label(selected.category)}
                    </dd>
                  </div>
                  <div className="rounded-none bg-muted/40 p-2.5 border border-border">
                    <dt className="text-muted-foreground">Crowdsourced Reports</dt>
                    <dd className="mt-0.5 font-bold text-primary">
                      {selected.reportCount} Corroborations
                    </dd>
                  </div>
                  <div className="rounded-none bg-muted/40 p-2.5 border border-border">
                    <dt className="text-muted-foreground">Verification State</dt>
                    <dd className="mt-0.5 font-semibold capitalize text-foreground">
                      {selected.verificationStatus}
                    </dd>
                  </div>
                  <div className="rounded-none bg-muted/40 p-2.5 border border-border">
                    <dt className="text-muted-foreground">Operational Status</dt>
                    <dd className="mt-0.5 font-semibold capitalize text-foreground">
                      {label(selected.status)}
                    </dd>
                  </div>
                </dl>

                {/* Coordinator Verification Actions */}
                <div className="p-3 bg-muted/20 border border-border space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Coordinator Verification Controls
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === selected._id}
                      onClick={() => {
                        setVerifyTargetStatus("verified");
                        setVerifyModalOpen(true);
                      }}
                      className="gap-1 text-xs"
                    >
                      <CheckCircle className="size-3.5" /> Verify Incident
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === selected._id}
                      onClick={() => {
                        setVerifyTargetStatus("outdated");
                        setVerifyModalOpen(true);
                      }}
                      className="gap-1 text-xs"
                    >
                      <Clock className="size-3.5" /> Mark Outdated
                    </Button>
                  </div>
                </div>

                {/* Attached Reports Corroboration */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary" />
                    Attached Field Reports ({selectedDetails?.reports.length ?? 0})
                  </h4>
                  {selectedDetails?.reports && selectedDetails.reports.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedDetails.reports.map((rep) => (
                        <div key={rep._id} className="p-2.5 bg-muted/40 border border-border text-xs space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>{rep.title}</span>
                            <span className="text-muted-foreground">{time(rep.createdAt)}</span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">{rep.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No individual reports attached yet.</p>
                  )}
                </div>

                {/* Verification History Audit Log */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <History className="size-3.5 text-primary" />
                    Verification History Timeline
                  </h4>
                  {selectedDetails?.verifications && selectedDetails.verifications.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedDetails.verifications.map((vRec) => (
                        <div key={vRec._id} className="p-2.5 bg-muted/40 border border-border text-xs space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span className="capitalize text-primary">{vRec.status}</span>
                            <span className="text-muted-foreground font-normal">{dateTime(vRec.createdAt)}</span>
                          </div>
                          {vRec.note && <p className="text-muted-foreground">{vRec.note}</p>}
                          <p className="text-[10px] text-muted-foreground">By: {vRec.verifierName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No historical verifications recorded yet.</p>
                  )}
                </div>

                <Link href={`/incidents/${selected._id}`}>
                  <Button variant="secondary" className="w-full h-9 text-xs gap-2">
                    Open Full Incident View
                    <PanelTopOpen className="size-3.5" />
                  </Button>
                </Link>

                {/* Status Update Quick Buttons */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Update Operational Status
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      "under_review",
                      "verified",
                      "active",
                      "contained",
                      "resolved",
                      "false_alarm",
                    ].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={selected.status === status ? "default" : "outline"}
                        disabled={busyId === selected._id}
                        onClick={() =>
                          runAction(
                            selected._id,
                            () =>
                              updateIncident({
                                incidentId: selected._id,
                                status: status as Incident["status"],
                              }),
                            `Incident marked ${label(status)}.`,
                          )
                        }
                        className="justify-start text-xs capitalize h-8"
                      >
                        {label(status)}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <MapPin className="size-8 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">Select an incident</h2>
                <p className="mt-1 max-w-[220px] text-sm text-muted-foreground">
                  Choose a situation to inspect linked reports, verify status, and view history timeline.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Verification Modal */}
        <Sheet open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                {verifyTargetStatus === "verified" ? "Verify Incident" : "Mark Incident Outdated"}
              </SheetTitle>
              <SheetDescription>
                Record your operational verification decision. This will append a permanent entry to the audit timeline.
              </SheetDescription>
            </SheetHeader>
            <form id="verify-incident-form" onSubmit={handleVerifySubmit} className="space-y-4 px-4 py-3">
              <label className="block space-y-1 text-sm font-semibold">
                Verification Note
                <Textarea
                  rows={4}
                  placeholder={
                    verifyTargetStatus === "verified"
                      ? "e.g. Confirmed by field volunteer on ground."
                      : "e.g. No active flooding observed during latest check."
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
              <Button form="verify-incident-form" type="submit">
                Submit Verification
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Create Incident Modal */}
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto sm:max-w-xl"
          >
            <SheetHeader>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Situation intake
              </span>
              <SheetTitle>Create incident</SheetTitle>
              <SheetDescription>
                Add an incident to the active response board.
              </SheetDescription>
            </SheetHeader>
            <form
              id="create-incident-form"
              onSubmit={submit}
              className="space-y-4 px-4"
            >
              <label className="block space-y-1.5 text-sm font-semibold">
                Title
                <Input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold">
                Description
                <Textarea
                  required
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-semibold">
                  Category
                  <Select
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target
                          .value as (typeof categories)[number],
                      })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {label(category)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block space-y-1.5 text-sm font-semibold">
                  Priority
                  <Select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        priority: event.target
                          .value as (typeof priorities)[number],
                      })
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-semibold">
                Address
                <Input
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-semibold">
                  Latitude
                  <Input
                    required
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(event) =>
                      setForm({ ...form, latitude: event.target.value })
                    }
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold">
                  Longitude
                  <Input
                    required
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(event) =>
                      setForm({ ...form, longitude: event.target.value })
                    }
                  />
                </label>
              </div>
            </form>
            <SheetFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                form="create-incident-form"
                type="submit"
                disabled={busyId === "create-incident"}
              >
                {busyId === "create-incident"
                  ? "Creating..."
                  : "Create incident"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
