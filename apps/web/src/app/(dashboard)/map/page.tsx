"use client";

import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { AlertTriangle, Building2, CircleDot, MapPin, Radio, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc } from "../../../../../../packages/backend/convex/_generated/dataModel";

const DEFAULT_CAMP_RADIUS_KM = 25;

const CoordinatorMap = dynamic(
  () => import("@/components/coordinator-map").then((module) => module.CoordinatorMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[560px] items-center justify-center bg-muted text-sm text-muted-foreground">
        Loading response map...
      </div>
    ),
  },
);

export default function MapPage() {
  const mapData = useQuery(api.public.map.getCoordinatorMapData);

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <MapPin className="size-4" />
              Live field map
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Response map
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Monitor reported conditions, active incidents, relief camps, and volunteer positions in one live view.
            </p>
          </div>
          <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <Radio className="size-3.5 text-primary" /> Live data
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        <div className="grid gap-4 sm:grid-cols-4">
          <LayerCount icon={<Building2 className="size-4" />} label="Camps" value={mapData?.camps?.length ?? "..."} tone="text-blue-600 dark:text-blue-400" />
          <LayerCount icon={<AlertTriangle className="size-4" />} label="Incidents" value={mapData?.incidents.length ?? "..."} tone="text-destructive" />
          <LayerCount icon={<CircleDot className="size-4" />} label="Reports" value={mapData?.reports.length ?? "..."} tone="text-accent-foreground" />
          <LayerCount icon={<Users className="size-4" />} label="Volunteer locations" value={mapData?.volunteers.length ?? "..."} tone="text-primary" />
        </div>

        <Card className="overflow-hidden rounded-none border-0 bg-card p-0 shadow-sm ring-1 ring-border">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground md:px-5">
            <span className="font-semibold text-foreground">Map layers</span>
              <Badge variant="outline" className="gap-1 border-blue-500/40 bg-blue-500/10 text-blue-700">
              <span className="size-2 rounded-full bg-blue-600" /> Camps ({DEFAULT_CAMP_RADIUS_KM}km radius)
            </Badge>
            <Badge variant="outline" className="gap-1 border-purple-500/40 bg-purple-500/10 text-purple-700">
              <span className="size-2 rounded-full bg-purple-600" /> My Camp
            </Badge>
            <Badge variant="destructive" className="gap-1"><span className="size-2 rounded-full bg-destructive-foreground" /> Incidents</Badge>
            <Badge variant="secondary" className="gap-1"><span className="size-2 rounded-full bg-secondary-foreground" /> Reports</Badge>
            <Badge className="gap-1"><span className="size-2 rounded-full bg-primary-foreground" /> Volunteers</Badge>
            <span className="ml-auto">Click a marker for details</span>
          </div>
          <div className="h-[min(72vh,760px)] min-h-[560px]">
            <CoordinatorMap data={mapData} />
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DataList
            title="Live incidents"
            count={mapData?.incidents.length ?? "..."}
            emptyLabel="No incidents in the database"
          >
            {mapData?.incidents.map((incident) => (
              <IncidentRow key={incident._id} incident={incident} />
            ))}
          </DataList>
          <DataList
            title="Camp jurisdictions"
            count={mapData?.camps?.length ?? "..."}
            emptyLabel="No camps in the database"
          >
            {mapData?.camps?.map((camp) => (
              <CampRow key={camp._id} camp={camp} />
            ))}
          </DataList>
        </div>
      </main>
    </div>
  );
}

function DataList({
  title,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  count: number | string;
  emptyLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {count}
        </span>
      </div>
      {count === 0 ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : <div className="divide-y divide-border">{children}</div>}
    </Card>
  );
}

function IncidentRow({ incident }: { incident: Doc<"incidents"> }) {
  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive/70" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{incident.title}</p>
          <Badge variant="outline" className="border-destructive/25 bg-destructive/5 text-[10px] uppercase text-destructive/80">
            {incident.priority}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{incident.description}</p>
        <p className="mt-2 text-[11px] capitalize text-muted-foreground/80">
          {incident.category.replaceAll("_", " ")} · {incident.status.replaceAll("_", " ")}
        </p>
      </div>
    </div>
  );
}

function CampRow({ camp }: { camp: Doc<"camps"> & { isMyCamp?: boolean } }) {
  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${camp.isMyCamp ? "bg-purple-500/70" : "bg-blue-500/70"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{camp.name}</p>
          {camp.isMyCamp && <Badge variant="outline" className="border-purple-500/25 bg-purple-500/5 text-[10px] text-purple-700">My camp</Badge>}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{camp.address}</p>
        <p className="mt-2 text-[11px] text-muted-foreground/80">{DEFAULT_CAMP_RADIUS_KM} km jurisdiction · <span className="capitalize">{camp.status}</span></p>
      </div>
    </div>
  );
}

function LayerCount({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <Card className="rounded-none border-0 bg-card p-4 shadow-sm ring-1 ring-border">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] ${tone}`}>
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
