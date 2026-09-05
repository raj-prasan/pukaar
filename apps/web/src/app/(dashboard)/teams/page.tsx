"use client";

import { useQuery } from "convex/react";
import {
  Activity,
  MapPin,
  Phone,
  Radio,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { api } from "../../../../../../packages/backend/convex/_generated/api";

const formatLabel = (value: string) => value.replaceAll("_", " ");
const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);

type Volunteer = {
  _id: string;
  userId: string;
  name: string;
  phone?: string;
  isActive: boolean;
  dispatch: { status: string; instructions?: string; updatedAt: number } | null;
  request: {
    category: string;
    description: string;
    address?: string;
    priority: string;
  } | null;
  latestLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
  } | null;
};

export default function TeamsPage() {
  const teams = useQuery(api.public.teams.getCoordinatorTeams);
  const volunteers = (teams?.flatMap((camp) => camp.volunteers) ?? []) as Volunteer[];
  const activeAssignments = volunteers.filter((v) => v.dispatch).length;
  const trackedVolunteers = volunteers.filter((v) => v.latestLocation).length;

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Users className="size-4" />
              Field operations
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Teams and camps
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              See who is available, assigned, and tracking positions across relief camps.
            </p>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <Radio className="size-3.5 text-primary" />
            Live data
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Summary label="Camps" value={teams?.length ?? "..."} icon={<ShieldCheck className="size-4" />} />
          <Summary label="Volunteers" value={teams ? volunteers.length : "..."} icon={<Users className="size-4" />} />
          <Summary label="Active assignments" value={teams ? activeAssignments : "..."} icon={<Route className="size-4" />} />
        </div>

        {teams?.length ? (
          <div className="space-y-6">
            {teams.map((camp) => (
              <Card key={camp._id} className="rounded-none border-0 bg-card p-0 shadow-sm ring-1 ring-border">
                <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between md:p-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold">{camp.name}</h2>
                      <Badge variant={camp.status === "active" ? "default" : "secondary"} className="capitalize">
                        {camp.status}
                      </Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {camp.address}{camp.city ? `, ${camp.city}` : ""}
                    </p>
                  </div>
                  <div className="text-left text-sm text-muted-foreground md:text-right">
                    <p className="font-semibold text-foreground">{camp.volunteers.length} volunteers</p>
                    <p>{camp.volunteers.filter((v) => v.isActive).length} active profiles</p>
                  </div>
                </div>
                {camp.volunteers.length ? (
                  <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
                    {camp.volunteers.map((volunteer) => (
                      <VolunteerRow key={volunteer._id} volunteer={volunteer as Volunteer} />
                    ))}
                  </div>
                ) : (
                  <div className="p-6">
                    <EmptyState label="No volunteers assigned to this camp" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : teams ? (
          <EmptyState label="No camps or volunteers are assigned to your coordinator profile" />
        ) : (
          <Card className="rounded-none border-0 bg-card p-10 text-center shadow-sm ring-1 ring-border">
            <Activity className="mx-auto size-6 animate-pulse text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading field teams...</p>
          </Card>
        )}

        {teams?.length ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="size-3.5 text-primary" />
            {trackedVolunteers} of {volunteers.length} volunteers have reported a location.
          </p>
        ) : null}
      </main>
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-none border-0 bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function VolunteerRow({ volunteer }: { volunteer: Volunteer }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {volunteer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{volunteer.name}</h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`size-2 rounded-full ${volunteer.isActive ? "bg-primary" : "bg-muted-foreground"}`} />
              {volunteer.isActive ? "Active profile" : "Inactive profile"}
            </p>
          </div>
        </div>
        <Badge variant={volunteer.dispatch ? "secondary" : "outline"} className="shrink-0 capitalize">
          {volunteer.dispatch ? formatLabel(volunteer.dispatch.status) : "available"}
        </Badge>
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
        {volunteer.dispatch && volunteer.request ? (
          <div>
            <p className="flex items-center gap-2 font-medium">
              <Route className="size-3.5 text-primary" />
              {formatLabel(volunteer.request.category)} request
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {volunteer.request.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {volunteer.request.priority}
              </Badge>
              <span>{volunteer.request.address || "Location provided"}</span>
            </div>
            {volunteer.dispatch.instructions && (
              <p className="mt-2 border-l-2 border-primary pl-2 text-xs text-muted-foreground">
                {volunteer.dispatch.instructions}
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Available for dispatch
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {volunteer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {volunteer.phone}
            </span>
          )}
          {volunteer.latestLocation ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {volunteer.latestLocation.latitude.toFixed(3)}, {volunteer.latestLocation.longitude.toFixed(3)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              No location reported
            </span>
          )}
        </div>

        {volunteer.latestLocation && (
          <p className="text-[11px] text-muted-foreground">
            Last location update {formatTime(volunteer.latestLocation.timestamp)}
            {volunteer.latestLocation.accuracy ? `, ±${Math.round(volunteer.latestLocation.accuracy)}m accuracy` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
