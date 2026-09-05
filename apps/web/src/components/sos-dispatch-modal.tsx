"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Plus,
  Send,
  Siren,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../packages/backend/convex/_generated/api";
import type { Doc, Id } from "../../../../packages/backend/convex/_generated/dataModel";

type ResourceAllocation = {
  inventoryId: Id<"inventory">;
  quantity: number;
};

const formatTime = (value: number) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    value,
  );

export interface SosDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSOS: any | null;
  volunteers?: Doc<"users">[];
  busyVolunteerIds?: Set<string>;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function SosDispatchModal({
  isOpen,
  onClose,
  targetSOS,
  volunteers,
  busyVolunteerIds = new Set(),
  onSuccess,
  onError,
}: SosDispatchModalProps) {
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>("");
  const [dispatchInstructions, setDispatchInstructions] = useState<string>("");
  const [selectedResources, setSelectedResources] = useState<ResourceAllocation[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);

  const inventoryData = useQuery(api.private.inventory.getCampInventory, {});
  const dispatchVolunteer = useMutation(api.private.dispatches.dispatchVolunteer);

  useEffect(() => {
    if (targetSOS) {
      setSelectedVolunteerId(targetSOS.volunteer?._id ?? "");
      setDispatchInstructions(targetSOS.dispatch?.instructions ?? "");
      setSelectedResources([]);
    }
  }, [targetSOS, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !targetSOS) return null;

  const addResourceItem = (inventoryId: Id<"inventory">) => {
    setSelectedResources((prev) => {
      const existing = prev.find((r) => r.inventoryId === inventoryId);
      if (existing) {
        return prev.map((r) =>
          r.inventoryId === inventoryId ? { ...r, quantity: r.quantity + 1 } : r,
        );
      }
      return [...prev, { inventoryId, quantity: 1 }];
    });
  };

  const removeResourceItem = (inventoryId: Id<"inventory">) => {
    setSelectedResources((prev) =>
      prev.filter((r) => r.inventoryId !== inventoryId),
    );
  };

  const updateResourceQuantity = (inventoryId: Id<"inventory">, quantity: number) => {
    if (quantity <= 0) {
      removeResourceItem(inventoryId);
      return;
    }
    setSelectedResources((prev) =>
      prev.map((r) => (r.inventoryId === inventoryId ? { ...r, quantity } : r)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVolunteerId) {
      onError?.("Please select a volunteer to dispatch");
      return;
    }

    setIsDispatching(true);
    try {
      const validResources = selectedResources.filter((r) => r.quantity > 0);
      await dispatchVolunteer({
        requestId: targetSOS._id,
        volunteerId: selectedVolunteerId as Id<"users">,
        instructions: dispatchInstructions.trim() || undefined,
        allocatedResources: validResources.length > 0 ? validResources : undefined,
      });

      const assignedVol = volunteers?.find((v) => v._id === selectedVolunteerId);
      const msg = assignedVol
        ? `Emergency response dispatched to ${assignedVol.name}!`
        : "Volunteer successfully dispatched to emergency SOS!";
      onSuccess?.(msg);
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to dispatch volunteer";
      onError?.(errorMsg);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 md:p-8 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-dispatch-title"
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-card border border-destructive/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-destructive/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <Siren className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="sos-dispatch-title" className="text-lg font-bold uppercase tracking-tight text-foreground">
                  Emergency SOS Dispatch Console
                </h3>
                <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                  Critical
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Deploy field responder and allocate emergency relief supplies for rapid extraction/aid.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-none transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="sos-dispatch-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Distress Signal Intelligence (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-destructive/5 border border-destructive/25 space-y-3">
                  <div className="flex items-center justify-between border-b border-destructive/20 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5" /> Distress Call Summary
                    </span>
                    {targetSOS.sosEvent?.situation && (
                      <Badge className="bg-destructive text-destructive-foreground text-[10px] uppercase font-bold">
                        {targetSOS.sosEvent.situation}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Emergency Description
                    </span>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {targetSOS.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-destructive/15 text-xs">
                    {targetSOS.requester && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Caller:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          {targetSOS.requester.name}
                          {targetSOS.requester.phone && (
                            <a
                              href={`tel:${targetSOS.requester.phone}`}
                              className="text-primary hover:underline flex items-center gap-0.5 ml-1"
                            >
                              <Phone className="size-3" />
                              {targetSOS.requester.phone}
                            </a>
                          )}
                        </span>
                      </div>
                    )}

                    {targetSOS.peopleCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Casualties / Affected:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Users className="size-3 text-muted-foreground" />
                          {targetSOS.peopleCount} {targetSOS.peopleCount === 1 ? "person" : "people"}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${targetSOS.latitude},${targetSOS.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          Open in Maps <ExternalLink className="size-3" />
                        </a>
                      </div>
                      <p className="text-xs font-medium text-foreground flex items-start gap-1">
                        <MapPin className="size-3.5 text-destructive shrink-0 mt-0.5" />
                        <span>
                          {targetSOS.address || `${targetSOS.latitude.toFixed(5)}, ${targetSOS.longitude.toFixed(5)}`}
                        </span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-destructive/15 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Reported:</span>
                      <span>{formatTime(targetSOS.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Responder Selection & Mission Brief (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Volunteer Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" /> Select Volunteer Responder *
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {volunteers?.length ?? 0} registered volunteers
                    </span>
                  </label>
                  <Select
                    required
                    value={selectedVolunteerId}
                    onChange={(e) => setSelectedVolunteerId(e.target.value)}
                    className="h-10 text-sm font-medium"
                  >
                    <option value="">-- Choose Field Responder --</option>
                    {volunteers && volunteers.length > 0 ? (
                      volunteers.map((vol) => {
                        const isBusy = busyVolunteerIds.has(vol._id);
                        return (
                          <option key={vol._id} value={vol._id}>
                            {vol.name} {vol.phone ? `(${vol.phone})` : ""} {isBusy ? "— [Busy on active mission]" : "— [Available for deployment]"}
                          </option>
                        );
                      })
                    ) : (
                      <option disabled value="none">
                        No registered volunteers in your camp
                      </option>
                    )}
                  </Select>
                  {selectedVolunteerId && busyVolunteerIds.has(selectedVolunteerId as any) && (
                    <p className="text-[11px] text-amber-600 font-medium">
                      ⚠️ Note: This volunteer already has an active mission. You may reassign them if appropriate.
                    </p>
                  )}
                </div>

                {/* Custom Dispatch Instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Tactical Mission Brief / Instructions (Optional)
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="e.g., Proceed to Sector 2 via North entrance. Victim reported injured. Carry stretcher and trauma pack."
                    value={dispatchInstructions}
                    onChange={(e) => setDispatchInstructions(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    These instructions will appear instantly on the volunteer's mobile app screen.
                  </p>
                </div>
              </div>
            </div>

            {/* Full-Width Section: Camp Inventory & Emergency Relief Gear */}
            <div className="p-4 bg-muted/20 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Package className="size-4 text-primary" /> Allocate Emergency Relief Supplies (Optional)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Assign field medical kits, drinking water, stretchers, or rations from camp inventory.
                  </p>
                </div>
                {selectedResources.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-bold">
                    {selectedResources.reduce((acc, r) => acc + r.quantity, 0)} Items Selected
                  </Badge>
                )}
              </div>

              {inventoryData?.items && inventoryData.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {inventoryData.items.map((item: any) => {
                    const allocated = selectedResources.find((r) => r.inventoryId === item._id);
                    return (
                      <div
                        key={item._id}
                        className={`p-2.5 border text-xs flex flex-col justify-between gap-2 transition-colors ${
                          allocated
                            ? "bg-primary/5 border-primary/40 shadow-xs"
                            : "bg-card border-border hover:border-border/80"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-foreground truncate">{item.itemName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            In Stock: <span className="font-medium">{item.quantity} {item.unit}</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          {allocated ? (
                            <div className="flex items-center gap-1.5 w-full justify-between">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateResourceQuantity(item._id, allocated.quantity - 1)}
                                  className="size-6 bg-muted hover:bg-muted/80 text-foreground text-xs flex items-center justify-center font-bold border border-border"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-xs font-bold">
                                  {allocated.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (allocated.quantity < item.quantity) {
                                      updateResourceQuantity(item._id, allocated.quantity + 1);
                                    }
                                  }}
                                  disabled={allocated.quantity >= item.quantity}
                                  className="size-6 bg-muted hover:bg-muted/80 text-foreground text-xs flex items-center justify-center font-bold border border-border disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeResourceItem(item._id)}
                                className="text-destructive hover:opacity-80 p-1"
                                title="Remove item"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 w-full text-[11px] px-2"
                              disabled={item.quantity <= 0}
                              onClick={() => addResourceItem(item._id)}
                            >
                              <Plus className="size-3 mr-0.5" /> Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No active camp inventory found.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <div className="text-xs text-muted-foreground">
            {selectedVolunteerId ? (
              <span>
                Deploying to: <strong className="text-foreground">{volunteers?.find((v) => v._id === selectedVolunteerId)?.name}</strong>
                {selectedResources.length > 0 && ` with ${selectedResources.reduce((acc, r) => acc + r.quantity, 0)} emergency items`}
              </span>
            ) : (
              <span>Select a volunteer to enable deployment</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              form="sos-dispatch-form"
              type="submit"
              disabled={isDispatching || !selectedVolunteerId}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold gap-1.5 h-10 px-5"
            >
              <Send className="size-4" />
              {isDispatching ? "Deploying Responder..." : "Confirm & Dispatch Volunteer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
