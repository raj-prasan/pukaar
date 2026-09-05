"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Check, ClipboardCheck, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc } from "../../../../../../packages/backend/convex/_generated/dataModel";

type Report = Doc<"reports">;
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

export  function ReportsPageView() {
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reports = useQuery(api.private.reports.getPendingReports);
  const verifyReport = useMutation(api.private.reports.verifyReport);

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
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="size-2 rounded-full bg-primary" />
              Verification desk
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Reports review
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Verify or reject field reports before they reach the response
              board.
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
          <div className="mb-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Verification desk
              </span>
              <h2 className="mt-2 text-xl font-semibold">
                Reports awaiting review
              </h2>
            </div>
            <ClipboardCheck className="size-5 text-primary" />
          </div>
          {reports?.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="rounded-none border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge
                        variant="secondary"
                        className="text-xs uppercase tracking-wider"
                      >
                        {label(report.category)}
                      </Badge>
                      <h3 className="mt-2 font-semibold">{report.title}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {time(report.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {report.description}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === report._id}
                      onClick={() =>
                        runAction(
                          report._id,
                          () =>
                            verifyReport({
                              reportId: report._id,
                              status: "verified",
                            }),
                          "Report verified.",
                        )
                      }
                      className="gap-1"
                    >
                      <Check className="size-3.5" /> Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === report._id}
                      onClick={() =>
                        runAction(
                          report._id,
                          () =>
                            verifyReport({
                              reportId: report._id,
                              status: "rejected",
                            }),
                          "Report rejected.",
                        )
                      }
                    >
                      <X className="size-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="All reports are reviewed" />
          )}
        </Card>
      </main>
    </div>
  );
}
