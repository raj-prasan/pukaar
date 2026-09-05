"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardCheck,
  HandHelping,
  MapPin,
  Plus,
  Radio,
  Siren,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc } from "../../../../../../packages/backend/convex/_generated/dataModel";

type Incident = Doc<"incidents">;
type AssistanceRequest = Doc<"assistanceRequests">;
type Report = Doc<"reports">;
type User = Doc<"users">;

export default function OverviewPageView() {
  const activeIncidents = useQuery(api.public.incidents.getActiveIncidents);
  const pendingRequests = useQuery(
    api.public.assistanceRequest.getPendingRequests,
  );
  const activeSOS = useQuery(api.public.sos.getActiveSOS);
  const pendingReports = useQuery(api.private.reports.getPendingReports);
  const volunteers = useQuery(api.private.users.volunteersUnderCoordinatorCamp);

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="size-2 rounded-full bg-destructive" />
              Operations room
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Coordinator control center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Make the next response decision from one live view of incidents,
              requests, and field signals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
              <Radio className="size-3.5 text-primary" />
              Live data
            </span>
            <Button
              render={<Link href="/incidents" />}
              className="h-10 gap-2 rounded-none px-4"
            >
              <Plus className="size-4" />
              New incident
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        <OverviewView
          activeSOSCount={activeSOS?.length ?? "..."}
          requestCount={pendingRequests?.length ?? "..."}
          reportCount={pendingReports?.length ?? "..."}
          incidentCount={activeIncidents?.length ?? "..."}
          activeIncidents={activeIncidents}
          activeSOS={activeSOS}
          pendingRequests={pendingRequests}
          pendingReports={pendingReports}
          volunteers={volunteers}
        />
      </main>
    </div>
  );
}

export function OverviewView({
  activeSOSCount,
  requestCount,
  reportCount,
  incidentCount,
  activeIncidents,
  activeSOS,
  pendingRequests,
  pendingReports,
  volunteers,
}: {
  activeSOSCount: number | string;
  requestCount: number | string;
  reportCount: number | string;
  incidentCount: number | string;
  activeIncidents?: Incident[];
  activeSOS?: AssistanceRequest[];
  pendingRequests?: AssistanceRequest[];
  pendingReports?: Report[];
  volunteers?: User[];
}) {
  const label = (value: string) => value.replaceAll("_", " ");
  const time = (value: number) =>
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(value);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Active SOS"
          value={activeSOSCount}
          tone="bg-destructive/10 text-destructive"
          icon={Siren}
        />
        <Metric
          label="Requests to triage"
          value={requestCount}
          tone="bg-accent/20 text-accent-foreground"
          icon={HandHelping}
        />
        <Metric
          label="Reports to verify"
          value={reportCount}
          tone="bg-secondary text-secondary-foreground"
          icon={ClipboardCheck}
        />
        <Metric
          label="Active incidents"
          value={incidentCount}
          tone="bg-primary/10 text-primary"
          icon={AlertTriangle}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 bg-card p-5 shadow-sm ring-1 ring-border md:p-6 rounded-none">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Situation board
              </span>
              <h2 className="mt-2 text-xl font-semibold">Active incidents</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/incidents" />}
              className="gap-1 text-primary"
            >
              View all <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
          {activeIncidents?.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {activeIncidents.slice(0, 3).map((incident) => (
                <div
                  key={incident._id}
                  className="rounded-none border border-border bg-card p-4"
                >
                  <Badge variant="secondary" className="text-[10px] uppercase rounded-none">
                    {incident.priority}
                  </Badge>
                  <h3 className="mt-4 font-semibold">{incident.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {incident.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No active incidents" />
          )}
        </Card>

        <Card className="border-0 bg-muted-foreground p-5 text-primary-foreground shadow-sm md:p-6 rounded-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
                Camp readiness
              </p>
              <h2 className="mt-2 text-xl font-semibold">Field team</h2>
            </div>
            <Users className="size-5" />
          </div>
          <p className="mt-8 text-5xl font-semibold">
            {volunteers?.length ?? "..."}
          </p>
          <p className="mt-2 text-sm text-primary-foreground/70">
            volunteers assigned to your camp
          </p>
          <div className="mt-8 flex items-center justify-between border-t border-primary-foreground/20 pt-4 text-xs text-primary-foreground/70">
            <span>Live roster</span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary-foreground" />{" "}
              Online data
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <QueueCard
          title="Active SOS"
          eyebrow="Immediate attention"
          icon={<Siren className="size-4" />}
          count={activeSOS?.length ?? "..."}
          tone="text-destructive"
          href="/requests"
        >
          {activeSOS?.length ? (
            activeSOS.slice(0, 2).map((request) => (
              <div
                key={request._id}
                className="border-b border-border py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="destructive">SOS</Badge>
                  <span className="text-xs text-muted-foreground">
                    {time(request.createdAt)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">
                  {request.description}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {request.address || "Location provided"}
                </p>
              </div>
            ))
          ) : (
            <EmptyState label="No active SOS signals" />
          )}
        </QueueCard>

        <QueueCard
          title="Assistance requests"
          eyebrow="Waiting for triage"
          icon={<HandHelping className="size-4" />}
          count={pendingRequests?.length ?? "..."}
          tone="text-accent-foreground"
          href="/requests"
        >
          {pendingRequests?.length ? (
            pendingRequests.slice(0, 2).map((request) => (
              <div
                key={request._id}
                className="border-b border-border py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium capitalize">
                    {label(request.category)}
                  </p>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {request.priority}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {request.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.peopleCount || 1} people need help
                </p>
              </div>
            ))
          ) : (
            <EmptyState label="No requests waiting" />
          )}
        </QueueCard>

        <QueueCard
          title="Reports to verify"
          eyebrow="Coordinator review"
          icon={<ClipboardCheck className="size-4" />}
          count={pendingReports?.length ?? "..."}
          tone="text-primary"
          href="/reports"
        >
          {pendingReports?.length ? (
            pendingReports.slice(0, 2).map((report) => (
              <div
                key={report._id}
                className="border-b border-border py-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{report.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {time(report.createdAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {report.description}
                </p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {label(report.category)}
                </Badge>
              </div>
            ))
          ) : (
            <EmptyState label="All reports are reviewed" />
          )}
        </QueueCard>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: string;
  icon: typeof Siren;
}) {
  return (
    <Card className="border-0 bg-card p-4 shadow-sm ring-1 ring-border rounded-none">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className={`rounded-none p-2 ${tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </Card>
  );
}

function QueueCard({
  title,
  eyebrow,
  icon,
  count,
  tone,
  href,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  count: number | string;
  tone: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-none border-0 bg-card p-5 shadow-sm ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`flex items-center gap-2 ${tone}`}>
            {icon}
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
              {eyebrow}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold">{title}</h2>
        </div>
        <span className="text-2xl font-semibold">{count}</span>
      </div>
      <div className="mt-3">{children}</div>
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={href} />}
        className="mt-3 gap-1 px-0 text-primary hover:bg-transparent hover:text-primary/80"
      >
        Open workspace <ArrowUpRight className="size-3.5" />
      </Button>
    </Card>
  );
}
