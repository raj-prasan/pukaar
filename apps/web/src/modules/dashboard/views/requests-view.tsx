"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  AlertTriangle,
  Clock3,
  ExternalLink,
  Flame,
  Footprints,
  HeartPulse,
  MapPin,
  Package,
  Phone,
  Pill,
  Radio,
  Send,
  ShieldCheck,
  Siren,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { SosDispatchModal } from "@/components/sos-dispatch-modal";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc, Id } from "../../../../../../packages/backend/convex/_generated/dataModel";

type ActionRunner = (
  id: string,
  action: () => Promise<unknown>,
  message: string,
) => Promise<void>;

const label = (value: string) => value.replaceAll("_", " ");
const time = (value: number) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    value,
  );

const SOS_PRESETS = [
  "🚨 Urgent casualty evacuation. Rapid triage required on arrival.",
  "🩹 Trauma / medical kit required. Administer emergency aid.",
  "⚠️ Structural hazard / trapped civilians. Approach with caution.",
  "🚤 Water / flood rescue. Relocate civilians to high ground.",
  "📦 Critical supplies: Deliver emergency rations and clean drinking water.",
];

function getSituationConfig(situation?: string | null) {
  switch (situation) {
    case "trapped":
      return {
        label: "Trapped Victim",
        icon: AlertTriangle,
        badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      };
    case "injured":
      return {
        label: "Injured Casualty",
        icon: HeartPulse,
        badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      };
    case "evacuation":
      return {
        label: "Evacuation Aid",
        icon: Footprints,
        badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      };
    case "medicine":
      return {
        label: "Critical Medicine",
        icon: Pill,
        badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      };
    case "danger":
      return {
        label: "Immediate Hazard",
        icon: Flame,
        badgeClass: "bg-red-600/15 text-red-700 dark:text-red-400 border-red-600/30",
      };
    default:
      return {
        label: "Emergency Rescue",
        icon: Siren,
        badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
      };
  }
}

function getDispatchStatusConfig(status?: string, dispatchStatus?: string | null) {
  if (dispatchStatus) {
    switch (dispatchStatus) {
      case "dispatched":
        return {
          label: "Dispatched · Pending Acceptance",
          badgeClass: "bg-primary/10 text-primary border-primary/30",
        };
      case "accepted":
        return {
          label: "Accepted · Mobilizing",
          badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30",
        };
      case "en_route":
        return {
          label: "Volunteer En Route",
          badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse",
        };
      case "arrived":
        return {
          label: "Volunteer On Scene",
          badgeClass: "bg-sky-500/15 text-sky-600 border-sky-500/30",
        };
      case "completed":
        return {
          label: "Mission Completed",
          badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
        };
      case "cancelled":
        return {
          label: "Dispatch Recalled",
          badgeClass: "bg-muted text-muted-foreground border-border",
        };
    }
  }

  switch (status) {
    case "submitted":
      return {
        label: "Awaiting Triage",
        badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
      };
    case "under_review":
      return {
        label: "Acknowledged · Ready to Dispatch",
        badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      };
    case "resolved":
      return {
        label: "Resolved / Safe",
        badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
      };
    default:
      return {
        label: status ? label(status) : "Pending",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

export function RequestsPageView() {
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showResolvedSOS, setShowResolvedSOS] = useState(false);

  // SOS Dispatch modal state
  const [dispatchSheetOpen, setDispatchSheetOpen] = useState(false);
  const [targetSOS, setTargetSOS] = useState<any | null>(null);

  // Queries
  const requests = useQuery(api.public.assistanceRequest.getPendingRequests);
  const sos = useQuery(api.public.sos.getActiveSOS, { includeResolved: showResolvedSOS });
  const volunteers = useQuery(api.private.users.volunteersUnderCoordinatorCamp);
  const activeDispatches = useQuery(api.private.dispatches.getCampDispatches, {});
  const volunteerRoleRequests = useQuery(api.private.users.pendingVolunteerRoleRequests);
  const currentUser = useQuery(api.public.users.getCurrentUserProfile);

  // Mutations
  const acknowledgeSOS = useMutation(api.public.sos.acknowledgeSOS);
  const cancelDispatch = useMutation(api.private.dispatches.cancelDispatch);
  const assignRequest = useMutation(api.public.assistanceRequest.assignRequest);
  const promoteToVolunteer = useMutation(api.private.users.promoteToVolunteer);
  const rejectVolunteerRoleRequest = useMutation(api.private.users.rejectVolunteerRoleRequest);

  const busyVolunteerIds = new Set(
    activeDispatches
      ?.filter((d) => d.status !== "completed" && d.status !== "cancelled")
      .map((d) => d.volunteerId) ?? [],
  );

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

  const openDispatchSheet = (sosRequest: any) => {
    setTargetSOS(sosRequest);
    setDispatchSheetOpen(true);
  };

  const handleCancelDispatch = async (dispatchId: Id<"dispatches">) => {
    setBusyId(dispatchId);
    try {
      await cancelDispatch({
        dispatchId,
        reason: "Coordinator recalled dispatch for reassignment",
      });
      setNotice("Dispatch recalled. The SOS signal is ready for reassignment.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to cancel dispatch");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground">
              <span className="size-2 rounded-full bg-destructive animate-ping" />
              Triage center
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Requests desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Dispatch volunteers to emergency SOS signals and assign incoming relief requests.
            </p>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <Radio className="size-3.5 text-primary animate-pulse" />
            Live data
          </span>
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

        {/* Volunteer Applications Section */}
        <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Users className="size-4" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Volunteer applications
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">Review camp volunteers</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Verify people who applied with your camp code.
              </p>
            </div>
            <Badge className="rounded-none border-transparent bg-primary/10 px-3 py-1 text-primary">
              {volunteerRoleRequests?.length ?? "..."} pending
            </Badge>
          </div>
          {volunteerRoleRequests?.length ? (
            <div className="space-y-3">
              {volunteerRoleRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex flex-col gap-4 border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {request.requester?.name ?? "Unknown applicant"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.requester?.email || request.requester?.phone || "No contact details"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {request.campName} · Applied {time(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === request._id}
                      onClick={() =>
                        runAction(
                          request._id,
                          () => promoteToVolunteer({ volunteerRoleRequestId: request._id }),
                          "Volunteer application approved.",
                        )
                      }
                    >
                      {busyId === request._id ? "Working..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === request._id}
                      onClick={() =>
                        runAction(
                          request._id,
                          () => rejectVolunteerRoleRequest({ volunteerRoleRequestId: request._id }),
                          "Volunteer application rejected.",
                        )
                      }
                      className="border-destructive/40 text-destructive"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No volunteer applications waiting for review" />
          )}
        </Card>

        {/* Priority SOS Dispatch Section */}
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <Card className="border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-destructive">
                  <Siren className="size-4 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
                    Priority queue
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold">
                  Emergency SOS signals
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct distress beacons requiring immediate volunteer deployment.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={!showResolvedSOS ? "default" : "outline"}
                  onClick={() => setShowResolvedSOS(false)}
                  className="h-8 text-xs font-semibold"
                >
                  Active ({sos?.filter((s: any) => s.status !== "resolved").length ?? 0})
                </Button>
                <Button
                  size="sm"
                  variant={showResolvedSOS ? "default" : "outline"}
                  onClick={() => setShowResolvedSOS(true)}
                  className="h-8 text-xs font-semibold"
                >
                  All Signals ({sos?.length ?? 0})
                </Button>
              </div>
            </div>

            {sos?.length ? (
              <div className="space-y-4">
                {sos.map((request: any) => {
                  const sit = getSituationConfig(request.sosEvent?.situation);
                  const SituationIcon = sit.icon;
                  const dispatchStatus = request.dispatch?.status;
                  const stat = getDispatchStatusConfig(request.status, dispatchStatus);

                  return (
                    <div
                      key={request._id}
                      className={`rounded-none border p-4 transition-all ${
                        dispatchStatus === "completed" || request.status === "resolved"
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : dispatchStatus
                            ? "border-primary/30 bg-primary/5"
                            : "border-destructive/30 bg-destructive/5"
                      }`}
                    >
                      {/* SOS Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="destructive" className="uppercase font-bold tracking-wider">
                            <Siren className="size-3 mr-1 animate-pulse" /> SOS
                          </Badge>
                          <Badge className={`text-xs font-semibold border ${sit.badgeClass}`}>
                            <SituationIcon className="size-3 mr-1" />
                            {sit.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs uppercase">
                            {request.priority}
                          </Badge>
                          <Badge className={`text-xs font-medium border ${stat.badgeClass}`}>
                            {stat.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock3 className="size-3" />
                          {time(request.createdAt)}
                        </span>
                      </div>

                      {/* Distress description & caller details */}
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {request.description}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                          {request.requester && (
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <span className="text-muted-foreground">Caller:</span>
                              <span>{request.requester.name}</span>
                              {request.requester.phone && (
                                <a
                                  href={`tel:${request.requester.phone}`}
                                  className="text-primary hover:underline flex items-center gap-1 ml-1"
                                >
                                  <Phone className="size-3" /> {request.requester.phone}
                                </a>
                              )}
                            </div>
                          )}
                          {request.peopleCount && (
                            <div className="flex items-center gap-1">
                              <Users className="size-3 text-muted-foreground" />
                              <span>{request.peopleCount} {request.peopleCount === 1 ? "person" : "people"} in distress</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 sm:col-span-2">
                            <MapPin className="size-3 text-destructive shrink-0" />
                            <span className="truncate">
                              {request.address || `${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}`}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1 shrink-0"
                            >
                              Maps <ExternalLink className="size-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Dispatch & Volunteer Section */}
                      {request.volunteer ? (
                        <div className="mt-4 p-3 bg-muted/40 border border-border space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {request.volunteer.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  {request.volunteer.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Assigned Field Responder
                                </p>
                              </div>
                            </div>
                            {request.volunteer.phone && (
                              <a
                                href={`tel:${request.volunteer.phone}`}
                                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/10 px-2 py-1"
                              >
                                <Phone className="size-3" />
                                {request.volunteer.phone}
                              </a>
                            )}
                          </div>

                          {request.dispatch?.instructions && (
                            <div className="text-xs text-muted-foreground italic bg-background/60 p-2 border border-border/60">
                              "{request.dispatch.instructions}"
                            </div>
                          )}

                          {request.items && request.items.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                Allocated Gear:
                              </span>
                              {request.items.map((item: any) => (
                                <Badge key={item._id} variant="secondary" className="text-[10px]">
                                  <Package className="size-2.5 mr-1" />
                                  {item.quantity} {item.unit} {item.itemName}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-border/60">
                            <span className="text-[10px] text-muted-foreground">
                              {request.dispatch?.dispatchedAt
                                ? `Dispatched at ${time(request.dispatch.dispatchedAt)}`
                                : "Dispatch Active"}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => openDispatchSheet(request)}
                              >
                                Reassign
                              </Button>
                              {request.dispatch && request.dispatch.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  disabled={busyId === request.dispatch._id}
                                  onClick={() => handleCancelDispatch(request.dispatch._id)}
                                >
                                  Recall
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-destructive/20">
                          <span className="text-xs text-muted-foreground italic">
                            No responder dispatched yet
                          </span>
                          <div className="flex items-center gap-2">
                            {request.status === "submitted" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === request._id}
                                onClick={() =>
                                  runAction(
                                    request._id,
                                    () => acknowledgeSOS({ requestId: request._id }),
                                    "SOS acknowledged.",
                                  )
                                }
                                className="border-destructive/40 text-destructive text-xs h-8"
                              >
                                {busyId === request._id ? "Working..." : "Acknowledge"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-8 gap-1.5 font-semibold"
                              onClick={() => openDispatchSheet(request)}
                            >
                              <Send className="size-3.5" />
                              Dispatch Volunteer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState label={showResolvedSOS ? "No SOS signals recorded" : "No active emergency SOS signals"} />
            )}
          </Card>

          {/* Camp Readiness Widget */}
          <Card className="rounded-none border-0 bg-primary p-5 text-primary-foreground shadow-lg md:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
                  Camp readiness
                </span>
                <ShieldCheck className="size-5 text-primary-foreground/70" />
              </div>
              <p className="mt-8 text-5xl font-semibold tracking-[-0.06em]">
                {volunteers?.length ?? "..."}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/70">
                active volunteers registered under your camp
              </p>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[74%] rounded-full bg-primary-foreground/80" />
              </div>
              <div className="mt-3 flex justify-between text-xs text-primary-foreground/70">
                <span>Response capacity</span>
                <span>
                  {volunteers && volunteers.length > 0 ? "Ready for Dispatch" : "Awaiting Volunteers"}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-primary-foreground/20 text-xs text-primary-foreground/80 space-y-2">
              <div className="flex justify-between">
                <span>Available responders:</span>
                <span className="font-semibold">
                  {(volunteers?.length ?? 0) - busyVolunteerIds.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Currently on mission:</span>
                <span className="font-semibold">{busyVolunteerIds.size}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Regular Assistance Requests & Field Team */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
                  Triage queue
                </span>
                <h2 className="mt-2 text-xl font-semibold">
                  Assistance requests
                </h2>
              </div>
              <Clock3 className="size-5 text-accent-foreground" />
            </div>
            {requests?.length ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request._id}
                    className="rounded-none border border-accent/30 bg-accent/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold capitalize">
                            {label(request.category)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {request.peopleCount || 1} people
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.description}
                        </p>
                      </div>
                      <Badge className="border-transparent bg-accent/20 text-[10px] uppercase text-accent-foreground">
                        {request.priority}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline size-3" />
                        {request.address || "Location provided"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === request._id || !currentUser}
                        onClick={() =>
                          currentUser &&
                          runAction(
                            request._id,
                            () =>
                              assignRequest({
                                requestId: request._id,
                                coordinatorId: currentUser._id,
                              }),
                            "Request assigned.",
                          )
                        }
                        className="border-accent/50 text-accent-foreground"
                      >
                        {busyId === request._id ? "Assigning..." : "Assign"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No requests waiting for triage" />
            )}
          </Card>

          <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Field team
                </span>
                <h2 className="mt-2 text-xl font-semibold">Camp volunteers</h2>
              </div>
              <Users className="size-5 text-primary" />
            </div>
            {volunteers?.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {volunteers.map((volunteer) => {
                  const isBusy = busyVolunteerIds.has(volunteer._id);
                  return (
                    <div
                      key={volunteer._id}
                      className="flex items-center gap-3 rounded-none bg-muted/40 p-3"
                    >
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {volunteer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {volunteer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isBusy ? "On mission" : "Available volunteer"}
                        </p>
                      </div>
                      <span
                        className={`ml-auto size-2 rounded-full ${
                          isBusy ? "bg-amber-500 animate-pulse" : "bg-primary"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState label="No volunteers assigned to this camp" />
            )}
          </Card>
        </div>
      </main>

      {/* SOS Volunteer Dispatch Full Screen Modal Dialog */}
      <SosDispatchModal
        isOpen={dispatchSheetOpen}
        onClose={() => {
          setDispatchSheetOpen(false);
          setTargetSOS(null);
        }}
        targetSOS={targetSOS}
        volunteers={volunteers}
        busyVolunteerIds={busyVolunteerIds}
        onSuccess={(msg) => setNotice(msg)}
        onError={(err) => setNotice(err)}
      />
    </div>
  );
}
