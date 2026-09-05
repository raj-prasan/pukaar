"use client";

import { useMutation, useQuery } from "convex/react";
import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Droplet,
  HeartPulse,
  History,
  Layers,
  MapPin,
  Package,
  PackagePlus,
  Pill,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tent,
  Trash2,
  Truck,
  Utensils,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "../../../../../../packages/backend/convex/_generated/api";
import type { Doc, Id } from "../../../../../../packages/backend/convex/_generated/dataModel";

type InventoryItem = {
  _id: Id<"inventory">;
  itemName: string;
  category: "food" | "water" | "medicine" | "first_aid" | "blanket" | "equipment" | "other";
  quantity: number;
  available: number;
  reserved: number;
  dispatched: number;
  unit: string;
  minimumStock: number;
  status: "healthy" | "low" | "critical";
  createdAt: number;
  updatedAt: number;
};

const categoryIcons: Record<string, React.ReactNode> = {
  water: <Droplet className="size-4 text-sky-500" />,
  food: <Utensils className="size-4 text-amber-500" />,
  first_aid: <HeartPulse className="size-4 text-rose-500" />,
  medicine: <Pill className="size-4 text-emerald-500" />,
  blanket: <Tent className="size-4 text-indigo-500" />,
  equipment: <Wrench className="size-4 text-purple-500" />,
  other: <Package className="size-4 text-slate-500" />,
};

const formatCategory = (cat: string) => cat.replaceAll("_", " ");

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);

export function ResourcesPageView() {
  const [activeTab, setActiveTab] = useState<string>("inventory");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState(false);

  // Feedback notifications
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals / Sheets State
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [restockRequestOpen, setRestockRequestOpen] = useState(false);
  const [fieldFacilityOpen, setFieldFacilityOpen] = useState(false);

  // Selected item for adjust / restock
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);

  // Form States
  const [newItem, setNewItem] = useState({
    itemName: "",
    category: "water" as InventoryItem["category"],
    quantity: "",
    unit: "Liters",
    minimumStock: "20",
    note: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    actionType: "restock" as "restock" | "consume" | "damaged" | "expired" | "correction",
    quantity: "",
    note: "",
  });

  const [restockForm, setRestockForm] = useState({
    requestedQuantity: "",
    priority: "high" as "low" | "medium" | "high" | "critical",
    note: "",
  });

  const [fieldFacilityForm, setFieldFacilityForm] = useState({
    name: "",
    type: "shelter" as "shelter" | "water" | "medicine" | "medical" | "road" | "other",
    address: "",
    latitude: "",
    longitude: "",
    capacity: "",
    contactMethod: "phone" as "phone" | "email" | "in_person" | "none",
    contactValue: "",
    description: "",
  });

  // Convex Queries & Mutations
  const inventoryData = useQuery(api.private.inventory.getCampInventory, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchQuery,
  });

  const transactions = useQuery(api.private.inventory.getInventoryTransactions, {
    limit: 50,
  });

  const fieldResources = useQuery(api.private.inventory.getFieldResources, {});

  const addStockItem = useMutation(api.private.inventory.addStockItem);
  const adjustStock = useMutation(api.private.inventory.adjustStock);
  const requestRestockMutation = useMutation(api.private.inventory.requestRestock);
  const seedStandardCampInventory = useMutation(api.private.inventory.seedStandardCampInventory);
  const addFieldResource = useMutation(api.private.inventory.addFieldResource);

  const camp = inventoryData?.camp;
  const items = inventoryData?.items ?? [];
  const stats = inventoryData?.stats;
  const lowStockAlerts = inventoryData?.lowStockAlerts ?? [];

  // Filter items by status
  const displayedItems = useMemo(() => {
    if (statusFilter === "all") return items;
    if (statusFilter === "low_critical") {
      return items.filter((i) => i.status === "low" || i.status === "critical");
    }
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const handleCopyCampCode = () => {
    if (camp?.uniqueCode) {
      navigator.clipboard.writeText(String(camp.uniqueCode));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSeedStandardStock = async () => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const count = await seedStandardCampInventory({});
      setNotice({
        type: "success",
        text: `Standard relief base inventory initialized (${count} categories added).`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to seed standard inventory",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.itemName.trim() || !newItem.quantity) {
      setNotice({ type: "error", text: "Please enter item name and initial quantity" });
      return;
    }
    const qty = parseFloat(newItem.quantity);
    const min = newItem.minimumStock ? parseFloat(newItem.minimumStock) : undefined;
    if (isNaN(qty) || qty <= 0) {
      setNotice({ type: "error", text: "Quantity must be a positive number" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addStockItem({
        itemName: newItem.itemName.trim(),
        category: newItem.category,
        quantity: qty,
        unit: newItem.unit.trim() || "units",
        minimumStock: min,
        note: newItem.note.trim() || undefined,
      });
      setNotice({ type: "success", text: `Stock item "${newItem.itemName}" recorded.` });
      setAddItemOpen(false);
      setNewItem({
        itemName: "",
        category: "water",
        quantity: "",
        unit: "Liters",
        minimumStock: "20",
        note: "",
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add inventory item",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    const qty = parseFloat(adjustForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      setNotice({ type: "error", text: "Quantity must be a positive number" });
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustStock({
        inventoryId: activeItem._id,
        actionType: adjustForm.actionType,
        quantity: qty,
        note: adjustForm.note.trim() || undefined,
      });
      setNotice({
        type: "success",
        text: `Inventory adjustment recorded for ${activeItem.itemName}.`,
      });
      setAdjustOpen(false);
      setActiveItem(null);
      setAdjustForm({ actionType: "restock", quantity: "", note: "" });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to adjust stock",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    const qty = parseFloat(restockForm.requestedQuantity);
    if (isNaN(qty) || qty <= 0) {
      setNotice({ type: "error", text: "Please enter a valid requested quantity" });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestRestockMutation({
        inventoryId: activeItem._id,
        requestedQuantity: qty,
        priority: restockForm.priority,
        note: restockForm.note.trim() || undefined,
      });
      setNotice({
        type: "success",
        text: `Restock request logged for ${qty} ${activeItem.unit} of ${activeItem.itemName}.`,
      });
      setRestockRequestOpen(false);
      setActiveItem(null);
      setRestockForm({ requestedQuantity: "", priority: "high", note: "" });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit restock request",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldFacilityForm.name.trim() || !fieldFacilityForm.address.trim()) {
      setNotice({ type: "error", text: "Please provide facility name and address" });
      return;
    }

    const lat = fieldFacilityForm.latitude ? parseFloat(fieldFacilityForm.latitude) : camp?.latitude ?? 20.59;
    const lon = fieldFacilityForm.longitude ? parseFloat(fieldFacilityForm.longitude) : camp?.longitude ?? 78.96;
    const cap = fieldFacilityForm.capacity ? parseFloat(fieldFacilityForm.capacity) : undefined;

    setIsSubmitting(true);
    try {
      await addFieldResource({
        name: fieldFacilityForm.name.trim(),
        type: fieldFacilityForm.type,
        address: fieldFacilityForm.address.trim(),
        latitude: lat,
        longitude: lon,
        capacity: cap,
        contactMethod: fieldFacilityForm.contactMethod,
        contactValue: fieldFacilityForm.contactValue.trim() || undefined,
        description: fieldFacilityForm.description.trim() || undefined,
      });
      setNotice({
        type: "success",
        text: `Field facility "${fieldFacilityForm.name}" registered and verified.`,
      });
      setFieldFacilityOpen(false);
      setFieldFacilityForm({
        name: "",
        type: "shelter",
        address: "",
        latitude: "",
        longitude: "",
        capacity: "",
        contactMethod: "phone",
        contactValue: "",
        description: "",
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to register field facility",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (item: InventoryItem, defaultAction: "restock" | "damaged" = "restock") => {
    setActiveItem(item);
    setAdjustForm({
      actionType: defaultAction,
      quantity: "",
      note: "",
    });
    setAdjustOpen(true);
  };

  const openRestockModal = (item: InventoryItem) => {
    setActiveItem(item);
    const deficit = Math.max(0, item.minimumStock * 2 - item.available);
    setRestockForm({
      requestedQuantity: String(deficit > 0 ? deficit : item.minimumStock),
      priority: item.status === "critical" ? "critical" : "high",
      note: `Low stock threshold alert for ${camp?.name ?? "Relief Camp"}`,
    });
    setRestockRequestOpen(true);
  };

  return (
    <div className="min-h-full overflow-y-auto bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Boxes className="size-4" />
              Base Operations
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              Resources & Inventory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Relief supplies, base warehouse inventory, field facility tracking, and mission resource allocation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {camp && (
              <div className="flex items-center gap-2 border border-border bg-muted/40 px-3 py-1.5 text-xs">
                <MapPin className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">{camp.name}</span>
                {camp.uniqueCode && (
                  <button
                    type="button"
                    onClick={handleCopyCampCode}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-[11px]"
                    title="Click to copy camp code for volunteers"
                  >
                    #{camp.uniqueCode}
                    {copiedCode ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                )}
              </div>
            )}

            <Button
              size="sm"
              onClick={() => setAddItemOpen(true)}
              className="h-9 gap-1.5 rounded-none text-xs font-semibold"
            >
              <PackagePlus className="size-4" />
              Add Stock
            </Button>

            {items.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleSeedStandardStock}
                className="h-9 gap-1.5 rounded-none border-primary/40 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <Sparkles className="size-4" />
                Initialize Base Kit
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {/* Notice Alert */}
        {notice && (
          <Alert
            variant={notice.type === "error" ? "destructive" : "success"}
            className="flex items-center justify-between gap-3 rounded-none"
          >
            <div className="flex items-center gap-2">
              {notice.type === "error" ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0" />
              )}
              <AlertDescription className="text-xs font-medium">
                {notice.text}
              </AlertDescription>
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </Alert>
        )}

        {/* Low-Stock Critical Alert Banner */}
        {lowStockAlerts.length > 0 && (
          <Card className="rounded-none border-destructive/40 bg-destructive/5 p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-destructive">
                    Low Stock Alert ({lowStockAlerts.length} item{lowStockAlerts.length > 1 ? "s" : ""} below minimum safety threshold)
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {lowStockAlerts.slice(0, 4).map((alert) => (
                      <span
                        key={alert._id}
                        className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 font-medium text-foreground shadow-2xs border border-destructive/20"
                      >
                        <span className="size-1.5 rounded-full bg-destructive" />
                        {alert.itemName}: {alert.available} {alert.unit} (Min: {alert.minimumStock})
                      </span>
                    ))}
                    {lowStockAlerts.length > 4 && (
                      <span className="text-muted-foreground text-[11px] self-center">
                        +{lowStockAlerts.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openRestockModal(lowStockAlerts[0])}
                  className="h-8 text-xs font-semibold rounded-none"
                >
                  Restock Request
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Top KPI Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Available Stock</span>
              <Boxes className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {stats ? stats.totalAvailable.toLocaleString() : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total units across {stats?.totalItems ?? 0} inventory items
            </p>
          </Card>

          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Reserved in Missions</span>
              <Truck className="size-4 text-amber-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats ? stats.totalReserved.toLocaleString() : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Allocated to active volunteer dispatches
            </p>
          </Card>

          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Dispatched & Delivered</span>
              <ArrowUpRight className="size-4 text-emerald-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats ? stats.totalDispatched.toLocaleString() : "..."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Delivered across completed missions
            </p>
          </Card>

          <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Health Status</span>
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {stats && stats.totalItems > 0
                  ? `${Math.round((stats.healthyCount / stats.totalItems) * 100)}%`
                  : "100%"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({stats?.healthyCount ?? 0} healthy / {stats?.lowCount ?? 0} low)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Camp relief operational readiness
            </p>
          </Card>
        </div>

        {/* Tabs: Warehouse Inventory vs Transactions Audit vs Field Resources */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
            <TabsList className="rounded-none bg-muted/60 p-1">
              <TabsTrigger value="inventory" className="rounded-none text-xs">
                Warehouse Stock ({items.length})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="rounded-none text-xs">
                Audit Movement ({transactions?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="facilities" className="rounded-none text-xs">
                Field Facilities ({fieldResources?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radio className="size-3 text-primary" />
              Live Convex sync active
            </div>
          </div>

          {/* TAB 1: Warehouse Stock */}
          <TabsContent value="inventory" className="space-y-4 pt-2">
            {/* Filter Bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: "all", label: "All Items" },
                  { key: "water", label: "Water" },
                  { key: "food", label: "Food" },
                  { key: "first_aid", label: "First Aid" },
                  { key: "medicine", label: "Medicine" },
                  { key: "blanket", label: "Blankets" },
                  { key: "equipment", label: "Equipment" },
                  { key: "other", label: "Other" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`rounded-none px-3 py-1.5 text-xs font-semibold transition-colors border ${
                      selectedCategory === tab.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search & Stock Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search stock items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-none"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 w-36 text-xs rounded-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="healthy">Healthy Only</option>
                  <option value="low_critical">Low / Out of Stock</option>
                  <option value="critical">Critical Only</option>
                </Select>
              </div>
            </div>

            {/* Inventory Table */}
            <Card className="rounded-none border border-border bg-card p-0 shadow-sm overflow-hidden">
              {displayedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState label="No inventory items found matching your filters" />
                  {items.length === 0 && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={handleSeedStandardStock}
                        disabled={isSubmitting}
                        className="gap-2 text-xs"
                      >
                        <Sparkles className="size-3.5" />
                        Initialize Standard Base Kit
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Resource / Item</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Health</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Available</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Reserved</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Dispatched</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Min Threshold</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedItems.map((item) => {
                        const icon = categoryIcons[item.category] || <Package className="size-4" />;
                        const percentOfMin = Math.min(
                          100,
                          Math.round((item.available / (item.minimumStock * 1.5 || 20)) * 100),
                        );

                        return (
                          <tr
                            key={item._id}
                            className="transition-colors hover:bg-muted/20"
                          >
                            <td className="px-4 py-3.5 font-medium">
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-7 items-center justify-center rounded bg-muted">
                                  {icon}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground text-sm">{item.itemName}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.unit}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 capitalize text-muted-foreground">
                              {formatCategory(item.category)}
                            </td>

                            <td className="px-4 py-3.5">
                              {item.status === "healthy" && (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] uppercase font-bold"
                                >
                                  🟢 Healthy
                                </Badge>
                              )}
                              {item.status === "low" && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] uppercase font-bold"
                                >
                                  🟡 Low Stock
                                </Badge>
                              )}
                              {item.status === "critical" && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] uppercase font-bold"
                                >
                                  🔴 Critical
                                </Badge>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                <span className="font-bold text-sm text-foreground">
                                  {item.available.toLocaleString()} {item.unit}
                                </span>
                                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      item.status === "critical"
                                        ? "bg-destructive"
                                        : item.status === "low"
                                          ? "bg-amber-500"
                                          : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${percentOfMin}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-muted-foreground">
                              {item.reserved > 0 ? (
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {item.reserved} {item.unit}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-muted-foreground">
                              {item.dispatched > 0 ? `${item.dispatched} ${item.unit}` : "—"}
                            </td>

                            <td className="px-4 py-3.5 text-muted-foreground">
                              {item.minimumStock} {item.unit}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAdjustModal(item, "restock")}
                                  className="h-7 px-2 text-[11px] rounded-none gap-1"
                                  title="Add or restock units"
                                >
                                  <Plus className="size-3" />
                                  Stock
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAdjustModal(item, "damaged")}
                                  className="h-7 px-2 text-[11px] rounded-none text-muted-foreground hover:text-destructive hover:border-destructive/40"
                                  title="Log damaged or written-off units"
                                >
                                  <Trash2 className="size-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openRestockModal(item)}
                                  className="h-7 px-2 text-[11px] rounded-none text-primary hover:bg-primary/10"
                                >
                                  Restock Req
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 2: Movement & Audit Ledger */}
          <TabsContent value="transactions" className="space-y-4 pt-2">
            <Card className="rounded-none border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-semibold text-base">Inventory Audit Trail</h3>
                  <p className="text-xs text-muted-foreground">
                    Historical record of inbound supplies, field allocations, and stock adjustments.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {transactions?.length ?? 0} transactions
                </Badge>
              </div>

              {!transactions || transactions.length === 0 ? (
                <EmptyState label="No stock movement records yet" />
              ) : (
                <div className="divide-y divide-border border border-border">
                  {transactions.map((tx) => (
                    <div
                      key={tx._id}
                      className="flex flex-col justify-between gap-3 p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded ${
                            tx.type === "in"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : tx.type === "out"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-purple-500/10 text-purple-600"
                          }`}
                        >
                          {tx.type === "in" ? (
                            <ArrowDownRight className="size-4" />
                          ) : tx.type === "out" ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {tx.itemName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${
                                tx.type === "in"
                                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                                  : tx.type === "out"
                                    ? "border-amber-500/30 text-amber-600 bg-amber-500/5"
                                    : "border-purple-500/30 text-purple-600 bg-purple-500/5"
                              }`}
                            >
                              {tx.type === "in" ? "+ Stock In" : tx.type === "out" ? "- Stock Out" : "~ Adjustment"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{tx.note || "No note recorded"}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 text-xs sm:text-right">
                        <div>
                          <p className="font-bold text-foreground">
                            {tx.type === "in" ? "+" : tx.type === "out" ? "-" : "±"}
                            {tx.quantity} {tx.unit}
                          </p>
                          <p className="text-[11px] text-muted-foreground">by {tx.performerName}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatDate(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 3: Field Facilities & Points */}
          <TabsContent value="facilities" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Community Relief Facilities</h3>
                <p className="text-xs text-muted-foreground">
                  Field shelters, medical posts, water points, and evacuation safe zones.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setFieldFacilityOpen(true)}
                className="h-8 text-xs font-semibold rounded-none gap-1.5"
              >
                <Plus className="size-3.5" />
                Add Facility
              </Button>
            </div>

            {!fieldResources || fieldResources.length === 0 ? (
              <EmptyState label="No external field facilities registered yet" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fieldResources.map((facility) => (
                  <Card
                    key={facility._id}
                    className="rounded-none border border-border bg-card p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="capitalize text-[10px] font-bold">
                          {facility.type}
                        </Badge>
                        <h4 className="mt-1 font-semibold text-sm text-foreground">
                          {facility.name}
                        </h4>
                      </div>
                      <Badge
                        variant={facility.verificationStatus === "verified" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {facility.verificationStatus}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {facility.address}
                    </p>

                    {facility.capacity !== undefined && (
                      <div className="border-t border-border pt-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Capacity</span>
                          <span className="font-semibold text-foreground">
                            {facility.occupiedCapacity ?? 0} / {facility.capacity} occupied
                          </span>
                        </div>
                      </div>
                    )}

                    {facility.contactValue && (
                      <div className="text-[11px] text-muted-foreground">
                        Contact: <span className="font-medium text-foreground">{facility.contactValue}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Sheet 1: Add New Inventory Item */}
      <Sheet open={addItemOpen} onOpenChange={setAddItemOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto rounded-none">
          <SheetHeader>
            <SheetTitle>Add Inventory Item</SheetTitle>
            <SheetDescription>
              Record incoming supplies or create a new inventory category for your relief base.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleAddItemSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item Name
              </label>
              <Input
                placeholder="e.g. Bottled Drinking Water, MRE Meals, First Aid Kits..."
                value={newItem.itemName}
                onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                required
                className="text-xs rounded-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </label>
                <Select
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      category: e.target.value as InventoryItem["category"],
                    })
                  }
                  className="text-xs rounded-none"
                >
                  <option value="water">Water</option>
                  <option value="food">Food</option>
                  <option value="first_aid">First Aid</option>
                  <option value="medicine">Medicine</option>
                  <option value="blanket">Blanket</option>
                  <option value="equipment">Equipment</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit Type
                </label>
                <Input
                  placeholder="Liters, Packs, Kits, Boxes..."
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  required
                  className="text-xs rounded-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Received Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="100"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  required
                  className="text-xs rounded-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Min Safety Stock
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="20"
                  value={newItem.minimumStock}
                  onChange={(e) => setNewItem({ ...newItem, minimumStock: e.target.value })}
                  className="text-xs rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Receiving Note / Supplier
              </label>
              <Textarea
                placeholder="e.g. NGO batch #104, Donated from Red Cross, Emergency airlift..."
                value={newItem.note}
                onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                rows={2}
                className="text-xs rounded-none"
              />
            </div>

            <SheetFooter className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-semibold rounded-none"
              >
                {isSubmitting ? "Saving..." : "Save Stock to Base"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet 2: Adjust Stock Modal */}
      <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto rounded-none">
          <SheetHeader>
            <SheetTitle>Stock Adjustment</SheetTitle>
            <SheetDescription>
              {activeItem ? (
                <>
                  Updating <span className="font-semibold text-foreground">{activeItem.itemName}</span> (Current Available: {activeItem.available} {activeItem.unit})
                </>
              ) : (
                "Update inventory levels"
              )}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Adjustment Action
              </label>
              <Select
                value={adjustForm.actionType}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    actionType: e.target.value as any,
                  })
                }
                className="text-xs rounded-none"
              >
                <option value="restock">Restock / Add Stock (+)</option>
                <option value="consume">Field Consumption / Local Usage (-)</option>
                <option value="damaged">Damaged / Spoiled Write-off (-)</option>
                <option value="expired">Expired Write-off (-)</option>
                <option value="correction">Audit Quantity Correction (±)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quantity ({activeItem?.unit ?? "units"})
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Quantity to add or deduct"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                required
                className="text-xs rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason / Note
              </label>
              <Textarea
                placeholder="e.g. Water bottles damaged in transport, Received local replenishment..."
                value={adjustForm.note}
                onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                rows={3}
                className="text-xs rounded-none"
              />
            </div>

            <SheetFooter className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-semibold rounded-none"
              >
                {isSubmitting ? "Applying..." : "Confirm Adjustment"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet 3: Restock Request Modal */}
      <Sheet open={restockRequestOpen} onOpenChange={setRestockRequestOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto rounded-none">
          <SheetHeader>
            <SheetTitle>Restock Request</SheetTitle>
            <SheetDescription>
              {activeItem ? (
                <>
                  Request replenishment for <span className="font-semibold text-foreground">{activeItem.itemName}</span> from Central Supply or nearby relief bases.
                </>
              ) : (
                "Request supplies from central dispatch"
              )}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleRestockSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requested Quantity ({activeItem?.unit ?? "units"})
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Quantity requested"
                value={restockForm.requestedQuantity}
                onChange={(e) => setRestockForm({ ...restockForm, requestedQuantity: e.target.value })}
                required
                className="text-xs rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Urgency Priority
              </label>
              <Select
                value={restockForm.priority}
                onChange={(e) =>
                  setRestockForm({
                    ...restockForm,
                    priority: e.target.value as any,
                  })
                }
                className="text-xs rounded-none"
              >
                <option value="critical">🚨 Critical - Out of Stock</option>
                <option value="high">⚠️ High - Under Minimum Safety</option>
                <option value="medium">Medium - Anticipated Demand</option>
                <option value="low">Low - Routine Replenishment</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Justification / Destination Details
              </label>
              <Textarea
                placeholder="e.g. Influx of 50 flood evacuees expected at Base Alpha tonight..."
                value={restockForm.note}
                onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })}
                rows={3}
                className="text-xs rounded-none"
              />
            </div>

            <SheetFooter className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-semibold rounded-none"
              >
                {isSubmitting ? "Submitting..." : "Send Restock Request"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet 4: Add Field Resource / Facility */}
      <Sheet open={fieldFacilityOpen} onOpenChange={setFieldFacilityOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto rounded-none">
          <SheetHeader>
            <SheetTitle>Register Field Facility</SheetTitle>
            <SheetDescription>
              Register community shelters, water points, or medical stations in your operational radius.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleFieldFacilitySubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Facility Name
              </label>
              <Input
                placeholder="e.g. Tezpur Government High School Shelter, City Tank #2..."
                value={fieldFacilityForm.name}
                onChange={(e) => setFieldFacilityForm({ ...fieldFacilityForm, name: e.target.value })}
                required
                className="text-xs rounded-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Facility Type
                </label>
                <Select
                  value={fieldFacilityForm.type}
                  onChange={(e) =>
                    setFieldFacilityForm({
                      ...fieldFacilityForm,
                      type: e.target.value as any,
                    })
                  }
                  className="text-xs rounded-none"
                >
                  <option value="shelter">Evacuation Shelter</option>
                  <option value="water">Community Water Station</option>
                  <option value="medical">Medical / Clinic Station</option>
                  <option value="food">Community Kitchen / Food Post</option>
                  <option value="road">Road Checkpoint / Block</option>
                  <option value="other">Other Facility</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Capacity (Persons)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  value={fieldFacilityForm.capacity}
                  onChange={(e) => setFieldFacilityForm({ ...fieldFacilityForm, capacity: e.target.value })}
                  className="text-xs rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Physical Address / Landmark
              </label>
              <Input
                placeholder="Street address or recognizable landmark..."
                value={fieldFacilityForm.address}
                onChange={(e) => setFieldFacilityForm({ ...fieldFacilityForm, address: e.target.value })}
                required
                className="text-xs rounded-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Latitude (Optional)
                </label>
                <Input
                  placeholder={camp ? String(camp.latitude.toFixed(4)) : "26.6338"}
                  value={fieldFacilityForm.latitude}
                  onChange={(e) => setFieldFacilityForm({ ...fieldFacilityForm, latitude: e.target.value })}
                  className="text-xs rounded-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Longitude (Optional)
                </label>
                <Input
                  placeholder={camp ? String(camp.longitude.toFixed(4)) : "92.7926"}
                  value={fieldFacilityForm.longitude}
                  onChange={(e) => setFieldFacilityForm({ ...fieldFacilityForm, longitude: e.target.value })}
                  className="text-xs rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Facility Contact Phone / Details
              </label>
              <Input
                placeholder="+91 98765 43210 (Site Incharge)"
                value={fieldFacilityForm.contactValue}
                onChange={(e) => setFieldFacilityForm({ ...fieldFacilityForm, contactValue: e.target.value })}
                className="text-xs rounded-none"
              />
            </div>

            <SheetFooter className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-semibold rounded-none"
              >
                {isSubmitting ? "Registering..." : "Register Facility"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
