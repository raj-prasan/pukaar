"use client";

import { useMutation, useQuery } from "convex/react";
import { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Search,
  Check,
  X,
  Mail,
  Phone,
  UserPlus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Id } from "../../../../../../packages/backend/convex/_generated/dataModel";

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);

export default function VolunteersPage() {
  const pendingRequests = useQuery(api.private.users.pendingVolunteerRoleRequests);
  const volunteers = useQuery(api.private.users.volunteersUnderCoordinatorCamp);
  const promoteToVolunteer = useMutation(api.private.users.promoteToVolunteer);
  const rejectVolunteerRoleRequest = useMutation(api.private.users.rejectVolunteerRoleRequest);

  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAccept = async (requestId: Id<"volunteerRoleRequests">, name: string) => {
    setBusyId(requestId);
    setNotice(null);
    try {
      await promoteToVolunteer({ volunteerRoleRequestId: requestId });
      setNotice({ type: "success", text: `${name} has been approved as a volunteer.` });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to accept volunteer request.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: Id<"volunteerRoleRequests">, name: string) => {
    setBusyId(requestId);
    setNotice(null);
    try {
      await rejectVolunteerRoleRequest({ volunteerRoleRequestId: requestId });
      setNotice({ type: "success", text: `Request from ${name} was rejected.` });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reject volunteer request.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const filteredVolunteers = useMemo(() => {
    if (!volunteers) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return volunteers;

    return volunteers.filter((vol) => {
      const name = vol.name?.toLowerCase() ?? "";
      const email = vol.email?.toLowerCase() ?? "";
      const phone = vol.phone ?? "";
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [volunteers, searchQuery]);

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <UserCheck className="size-4" />
              Camp Management
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Volunteers
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review volunteer applications and oversee volunteers assigned to your camp.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {/* Notice alert */}
        {notice && (
          <Alert
            variant={notice.type === "error" ? "destructive" : "success"}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              {notice.type === "error" ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : (
                <Check className="size-4 shrink-0" />
              )}
              <AlertDescription className="text-xs font-medium">
                {notice.text}
              </AlertDescription>
            </div>
            <button
              aria-label="Dismiss notice"
              onClick={() => setNotice(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </Alert>
        )}

        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Camp Volunteers</span>
              <Users className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {volunteers ? volunteers.length : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered volunteers at your camp
            </p>
          </Card>

          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Pending Applications</span>
              <UserPlus className="size-4 text-amber-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {pendingRequests ? pendingRequests.length : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Awaiting coordinator review
            </p>
          </Card>
        </div>

        {/* Pending Volunteer Role Requests Section */}
        <Card className="rounded-none border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <UserPlus className="size-4" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Applications
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">
                Volunteer Requests
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Users who applied to join as volunteers for your camp. Accept to promote them.
              </p>
            </div>
            <Badge
              variant="secondary"
              className="border-transparent bg-primary/10 px-3 py-1 font-semibold text-primary"
            >
              {pendingRequests?.length ?? 0} pending
            </Badge>
          </div>

          {pendingRequests === undefined ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading requests...
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="divide-y divide-border border border-border">
              {pendingRequests.map((req) => {
                const applicantName = req.requester?.name || "Unknown Applicant";
                const isBusy = busyId === req._id;

                return (
                  <div
                    key={req._id}
                    className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {applicantName}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          Pending Review
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {req.requester?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3 text-primary" />
                            {req.requester.email}
                          </span>
                        )}
                        {req.requester?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3 text-primary" />
                            {req.requester.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          Applied {formatDate(req.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleAccept(req._id, applicantName)}
                        className="h-8 gap-1 text-xs font-semibold"
                      >
                        <Check className="size-3.5" />
                        {isBusy ? "Accepting..." : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleReject(req._id, applicantName)}
                        className="h-8 gap-1 border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <X className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState label="No pending volunteer requests" />
          )}
        </Card>

        {/* Camp Volunteers List Section */}
        <Card className="rounded-none border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="size-4" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Camp Team
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">
                Registered Volunteers
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Active volunteers currently assigned to your camp base.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          {volunteers === undefined ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading volunteers...
            </div>
          ) : filteredVolunteers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVolunteers.map((vol) => (
                <div
                  key={vol._id}
                  className="flex items-start gap-3 border border-border bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                    {vol.name?.charAt(0).toUpperCase() || "V"}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {vol.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400"
                      >
                        Active
                      </Badge>
                    </div>

                    {vol.phone ? (
                      <a
                        href={`tel:${vol.phone}`}
                        className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
                      >
                        <Phone className="size-3 shrink-0 text-primary" />
                        {vol.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">No phone listed</p>
                    )}

                    {vol.email && (
                      <a
                        href={`mailto:${vol.email}`}
                        className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
                      >
                        <Mail className="size-3 shrink-0 text-primary" />
                        {vol.email}
                      </a>
                    )}

                    <p className="pt-1 text-[11px] text-muted-foreground">
                      Joined {formatDate(vol.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : volunteers.length === 0 ? (
            <EmptyState label="No volunteers registered under this camp yet" />
          ) : (
            <EmptyState label="No volunteers match your search query" />
          )}
        </Card>
      </main>
    </div>
  );
}
