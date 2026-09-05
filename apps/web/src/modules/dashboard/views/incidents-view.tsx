"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronRight,
  MapPin,
  PanelTopOpen,
  Plus,
  Radio,
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
import type { Doc } from "../../../../../../packages/backend/convex/_generated/dataModel";
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

export function IncidentsPageView() {
  const [selectedId, setSelectedId] = useState<Incident["_id"] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
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
  const createIncident = useMutation(
    api.private.incidents.createIncidentByCoordinator,
  );
  const updateIncident = useMutation(api.private.incidents.updateIncident);

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
      "Incident created and added to the active board.",
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
              Track, inspect, and update the active incidents on the response
              board.
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
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
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
                      <Badge
                        className={`border-transparent text-[10px] uppercase ${incident.priority === "critical" ? "bg-destructive/10 text-destructive" : incident.priority === "high" ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
                      >
                        {incident.priority}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 font-semibold">{incident.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {incident.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">
                        {label(incident.status)}
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
          <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6">
            {selected ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                      Incident detail
                    </span>
                    <h2 className="mt-2 text-lg font-semibold">
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
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {selected.description}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-none bg-muted/40 p-3">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="mt-1 font-semibold capitalize">
                      {label(selected.category)}
                    </dd>
                  </div>
                  <div className="rounded-none bg-muted/40 p-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-1 font-semibold capitalize">
                      {label(selected.status)}
                    </dd>
                  </div>
                </dl>
                <Link href={`/incidents/${selected._id}`}>
                  <Button
                    aria-label="Close incident detail"
                    onClick={() => setSelectedId(null)}
                    className="rounded-none p-1 bg-secondary/60 text-muted-foreground hover:bg-muted"
                  >
                    Incident Details
                    <PanelTopOpen className="size-4" />
                  </Button>
                </Link>

                <div className="mt-5 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Update status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                        variant={
                          selected.status === status ? "default" : "outline"
                        }
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
                        className="justify-start capitalize"
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
                  Choose a situation to inspect and update it.
                </p>
              </div>
            )}
          </Card>
        </div>
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
