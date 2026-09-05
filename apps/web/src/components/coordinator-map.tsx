"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React, { useMemo } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Doc } from "../../../../packages/backend/convex/_generated/dataModel";

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

type EnrichedCamp = Doc<"camps"> & {
  isMyCamp?: boolean;
};

type MapData = {
  reports: Doc<"reports">[];
  incidents: Doc<"incidents">[];
  volunteers: Array<
    Doc<"volunteerLocations"> & {
      dispatchStatus: string;
      volunteerName: string;
    }
  >;
  camps?: EnrichedCamp[];
  currentUserId?: string;
  userCampId?: string;
};

const markerColors = {
  report: "#eab308",
  incident: "#ef4444",
  volunteer: "#16a34a",
  camp: "#2563eb",
  myCamp: "#7c3aed",
} as const;

function Marker({
  position,
  color,
  children,
  radius = 9,
}: {
  position: [number, number];
  color: string;
  children: React.ReactNode;
  radius?: number;
}) {
  return (
    <CircleMarker
      center={position}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 3,
      }}
    >
      <Popup>{children}</Popup>
    </CircleMarker>
  );
}

export function CoordinatorMap({ data }: { data?: MapData }) {
  const center = useMemo<[number, number]>(() => {
    const myCamp = data?.camps?.find(
      (c) => c.isMyCamp || c._id === data?.userCampId || c.createdBy === data?.currentUserId
    );
    const firstCamp = data?.camps?.[0];
    const firstIncident = data?.incidents[0];
    const firstReport = data?.reports[0];
    const location = myCamp ?? firstCamp ?? firstIncident ?? firstReport;
    return location ? [location.latitude, location.longitude] : INDIA_CENTER;
  }, [data]);

  return (
    <MapContainer
      center={center}
      zoom={data?.camps?.length || data?.incidents.length || data?.reports.length ? 6 : 5}
      scrollWheelZoom
      className="h-full min-h-[560px] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {data?.camps?.map((camp) => {
        const isMyCamp =
          camp.isMyCamp ||
          camp._id === data?.userCampId ||
          camp.createdBy === data?.currentUserId;
        const color = isMyCamp ? markerColors.myCamp : markerColors.camp;

        return (
          <React.Fragment key={`camp-group-${camp._id}`}>
            {/* 100 km Radius Circle (100,000 meters) */}
            <Circle
              center={[camp.latitude, camp.longitude]}
              radius={100000}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isMyCamp ? 0.18 : 0.1,
                weight: isMyCamp ? 2.5 : 1.5,
                dashArray: isMyCamp ? undefined : "6, 6",
              }}
            />
            <Marker
              position={[camp.latitude, camp.longitude]}
              color={color}
              radius={isMyCamp ? 11 : 9}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>{camp.name}</span>
                  {isMyCamp && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                      My Camp
                    </span>
                  )}
                </div>
                {camp.address && <p className="text-xs">{camp.address}</p>}
                {camp.city && <p className="text-xs">City: {camp.city}</p>}
                {camp.contactPhone && (
                  <p className="text-xs">Phone: {camp.contactPhone}</p>
                )}
                <div className="mt-1 pt-1 border-t text-[11px]">
                  Status: <span className="capitalize">{camp.status}</span> · 100 km radius
                </div>
              </div>
            </Marker>
          </React.Fragment>
        );
      })}

      {data?.incidents.map((incident) => (
        <Marker
          key={`incident-${incident._id}`}
          position={[incident.latitude, incident.longitude]}
          color={markerColors.incident}
        >
          <strong>{incident.title}</strong>
          <br />
          <span>{incident.description}</span>
          <br />
          <small>
            Incident · {incident.priority} priority · {incident.status}
          </small>
        </Marker>
      ))}

      {data?.reports.map((report) => (
        <Marker
          key={`report-${report._id}`}
          position={[report.latitude, report.longitude]}
          color={markerColors.report}
        >
          <strong>{report.title}</strong>
          <br />
          <span>{report.description}</span>
          <br />
          <small>
            Report · {report.category} · {report.verificationStatus}
          </small>
        </Marker>
      ))}

      {data?.volunteers.map((volunteer) => (
        <Marker
          key={`volunteer-${volunteer._id}`}
          position={[volunteer.latitude, volunteer.longitude]}
          color={markerColors.volunteer}
        >
          <strong>{volunteer.volunteerName}</strong>
          <br />
          <small>
            Volunteer · {volunteer.dispatchStatus}
            {volunteer.accuracy ? ` · ±${Math.round(volunteer.accuracy)}m` : ""}
          </small>
        </Marker>
      ))}
    </MapContainer>
  );
}
