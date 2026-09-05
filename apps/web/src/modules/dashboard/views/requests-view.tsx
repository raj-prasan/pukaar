"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  Clock3,
  MapPin,
  Radio,
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
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc } from "../../../../../../packages/backend/convex/_generated/dataModel";

type AssistanceRequest = Doc<"assistanceRequests">;
type User = Doc<"users">;
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

export  function RequestsPageView() {
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = useQuery(api.public.assistanceRequest.getPendingRequests);
  const sos = useQuery(api.public.sos.getActiveSOS);
  const volunteers = useQuery(api.private.users.volunteersUnderCoordinatorCamp);
  const volunteerRoleRequests = useQuery(api.private.users.pendingVolunteerRoleRequests);
  const currentUser = useQuery(api.public.users.getCurrentUserProfile);
  const acknowledgeSOS = useMutation(api.public.sos.acknowledgeSOS);
  const assignRequest = useMutation(api.public.assistanceRequest.assignRequest);
  const promoteToVolunteer = useMutation(api.private.users.promoteToVolunteer);
  const rejectVolunteerRoleRequest = useMutation(api.private.users.rejectVolunteerRoleRequest);

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

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground">
              <span className="size-2 rounded-full bg-destructive" />
              Triage center
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Requests desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Respond to SOS signals and assign incoming assistance requests.
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
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-destructive">
                  <Siren className="size-4" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
                    Priority queue
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold">
                  Active SOS signals
                </h2>
              </div>
              <Badge variant="destructive" className="rounded-none px-3 py-1">
                Needs response
              </Badge>
            </div>
            {sos?.length ? (
              <div className="space-y-3">
                {sos.map((request) => (
                  <div
                    key={request._id}
                    className="rounded-none border border-destructive/20 bg-destructive/5 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="uppercase">
                            SOS
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {time(request.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold text-foreground">
                          {request.description}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {request.address ||
                            `${request.latitude.toFixed(3)}, ${request.longitude.toFixed(3)}`}
                        </p>
                      </div>
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
                        className="border-destructive/40 text-destructive"
                      >
                        {busyId === request._id ? "Working..." : "Acknowledge"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No active SOS signals" />
            )}
          </Card>
          <Card className="rounded-none border-0 bg-primary p-5 text-primary-foreground shadow-lg md:p-6">
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
              active volunteers assigned to your camp
            </p>
            <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[74%] rounded-full bg-primary-foreground/80" />
            </div>
            <div className="mt-3 flex justify-between text-xs text-primary-foreground/70">
              <span>Response capacity</span>
              <span>Good</span>
            </div>
          </Card>
        </div>
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
                {volunteers.map((volunteer) => (
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
                        Available volunteer
                      </p>
                    </div>
                    <span className="ml-auto size-2 rounded-full bg-primary" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No volunteers assigned to this camp" />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
