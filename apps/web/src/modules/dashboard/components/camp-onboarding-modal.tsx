"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Compass,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "../../../../../../packages/backend/convex/_generated/api";

export function CampOnboardingModal() {
  const profile = useQuery(api.public.users.getCurrentUserProfile);
  const createCamp = useMutation(api.private.camps.createCoordinatorCamp);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [contactPhone, setContactPhone] = useState("");

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Show modal only if user is logged in, has a profile, and has no campId set
  const needsCampSetup =
    profile !== undefined &&
    profile !== null &&
    !profile.campId;

  if (!needsCampSetup) {
    return null;
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (error) => {
        setErrorMessage(
          error.message || "Unable to retrieve your location. Please enter coordinates manually.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !latitude || !longitude) {
      setErrorMessage("Please fill in camp name, address, latitude, and longitude.");
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      setErrorMessage("Please enter valid numerical latitude and longitude.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createCamp({
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
        latitude: latNum,
        longitude: lonNum,
        contactPhone: contactPhone.trim() || undefined,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create camp. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl border border-border bg-card p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20">
            <ShieldCheck className="size-3.5 text-primary" />
            First-Time Coordinator Setup
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Register Your Operational Camp
          </h2>
          <p className="text-xs leading-5 text-muted-foreground md:text-sm">
            Welcome to Pukaar Command. Before responding to active disasters, set up your primary relief base or camp location so dispatches and assistance requests can be routed to you.
          </p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="text-xs">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Camp Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" /> Camp / Relief Base Name *
            </label>
            <Input
              required
              placeholder="e.g. Tezpur Central Relief Command"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm h-10"
            />
          </div>

          {/* Address & City */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> Street Address / Landmark *
              </label>
              <Input
                required
                placeholder="e.g. Tezpur University Gate 2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-sm h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                City / Region
              </label>
              <Input
                placeholder="e.g. Tezpur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="text-sm h-10"
              />
            </div>
          </div>

          {/* Coordinates & Geolocation */}
          <div className="p-3.5 bg-muted/30 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Compass className="size-3.5 text-primary" /> Camp Coordinates *
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLocating}
                onClick={handleGeolocate}
                className="h-7 text-xs gap-1.5"
              >
                <Navigation className="size-3 text-primary" />
                {isLocating ? "Locating..." : "Auto-Detect My GPS"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-semibold">
                  Latitude
                </label>
                <Input
                  required
                  type="number"
                  step="any"
                  placeholder="e.g. 26.7017"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-semibold">
                  Longitude
                </label>
                <Input
                  required
                  type="number"
                  step="any"
                  placeholder="e.g. 92.8361"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Phone className="size-3.5 text-primary" /> Camp Helpline / Contact Phone
            </label>
            <Input
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="text-sm h-10"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 text-sm font-bold gap-2 mt-2"
          >
            {isSubmitting ? (
              "Setting up camp..."
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Create Camp & Activate Dashboard
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
