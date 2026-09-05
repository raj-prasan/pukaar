"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Radio,
  Route,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { api } from "../../../../../../../packages/backend/convex/_generated/api";

const formatStatus = (status: string) => status.replaceAll("_", " ");

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);

export default function ResourceAllocationPage() {
  const dispatches = useQuery(api.private.dispatches.getCampDispatches, {});

  const dispatchesWithResources = dispatches?.filter((d) => d.items && d.items.length > 0) ?? [];
  const activeCount = dispatchesWithResources.filter(
    (d) => d.status !== "completed" && d.status !== "cancelled",
  ).length;

  const totalAllocatedUnits = dispatchesWithResources.reduce(
    (acc, d) => acc + d.items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/resources" />}
                className="h-7 -ml-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Back to Inventory
              </Button>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Resource Allocations
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track warehouse resources and relief supplies issued to volunteers for active missions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="size-3.5 text-primary" />
              Live allocation tracking
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {/* Top Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Missions with Supplies</span>
              <Truck className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {dispatches ? dispatchesWithResources.length : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeCount} currently active in field
            </p>
          </Card>

          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Total Units Allocated</span>
              <Boxes className="size-4 text-amber-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {dispatches ? totalAllocatedUnits.toLocaleString() : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supplies issued from base inventory
            </p>
          </Card>

          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Connected Incidents</span>
              <ShieldCheck className="size-4 text-emerald-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {dispatches
                ? new Set(dispatchesWithResources.map((d) => d.incident?._id).filter(Boolean)).size
                : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Distinct incidents receiving base supplies
            </p>
          </Card>
        </div>

        {/* Allocations Table */}
        <Card className="rounded-none border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-semibold">Active & Historical Resource Dispatches</h2>
              <p className="text-xs text-muted-foreground">
                Connecting Incidents ➔ Assigned Volunteers ➔ Base Supplies.
              </p>
            </div>
          </div>

          {!dispatches ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading allocation telemetry...
            </div>
          ) : dispatchesWithResources.length === 0 ? (
            <div className="py-8">
              <EmptyState label="No mission resource dispatches found. Supplies allocated during volunteer dispatch will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-border border border-border">
              {dispatchesWithResources.map((d) => (
                <div
                  key={d._id}
                  className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/20 lg:flex-row lg:items-center"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        MISSION #{d._id.slice(-6).toUpperCase()}
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          d.status === "completed"
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                            : d.status === "arrived"
                              ? "border-blue-500/30 text-blue-600 bg-blue-500/10"
                              : d.status === "en_route"
                                ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                : "border-border bg-muted"
                        }`}
                      >
                        {formatStatus(d.status)}
                      </Badge>

                      {d.incident && (
                        <Link
                          href={`/incidents/${d.incident._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:text-primary hover:underline"
                        >
                          Incident: {d.incident.title}
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </Link>
                      )}
                    </div>

                    {/* Volunteer & Destination */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-primary" />
                        Volunteer:{" "}
                        <strong className="text-foreground">{d.volunteer?.name || "Assigned Volunteer"}</strong>
                      </span>

                      {d.volunteer?.phone && (
                        <a
                          href={`tel:${d.volunteer.phone}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="size-3" />
                          {d.volunteer.phone}
                        </a>
                      )}

                      {d.request?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {d.request.address}
                        </span>
                      )}

                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="size-3" />
                        {formatDate(d.dispatchedAt)}
                      </span>
                    </div>

                    {/* Instructions */}
                    {d.instructions && (
                      <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                        Instructions: {d.instructions}
                      </p>
                    )}
                  </div>

                  {/* Allocated Supplies Pill Badges */}
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="text-xs font-semibold text-muted-foreground mr-1">
                      Supplies:
                    </div>
                    {d.items.map((item) => (
                      <Badge
                        key={item._id}
                        variant="secondary"
                        className="gap-1.5 rounded-none border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs"
                      >
                        <Package className="size-3 text-primary" />
                        <span>
                          {item.quantity} {item.unit}
                        </span>
                        <span className="text-muted-foreground">({item.itemName})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
