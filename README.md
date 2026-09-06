# 🚨 PUKAAR (पुकार)

### Real-Time Crowdsourced Disaster Response, Hyper-Local Relief Coordination & SOS Dispatch Platform

[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-ef4444?style=flat-square&logo=turborepo&logoColor=white)](https://turborepo.dev/)
[![Next.js](https://img.shields.io/badge/Web-Next.js%2015-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Expo](https://img.shields.io/badge/Mobile-Expo%20SDK%2057-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native%200.86-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Convex](https://img.shields.io/badge/Backend-Convex%20Reactive%20DB-f97316?style=flat-square&logo=convex&logoColor=white)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 📌 Overview

**Pukaar** (_"The Cry for Help"_) is an end-to-end disaster response and emergency coordination platform designed to bridge the gap between citizens in life-threatening distress and on-the-ground rescue units.

During crises (floods, earthquakes, fires, landslides), emergency hotlines collapse, rumors spread, and responders operate blindly. Pukaar replaces this chaos with a unified, real-time reactive pipeline:

- **Citizens**: Send one-tap SOS distress beacons and photo-verified incident reports via an offline-capable mobile app.
- **Base Coordinators**: Manage tactical ground response—verifying incidents, merging duplicate reports, monitoring relief camp stock, and dispatching volunteers.
- **Volunteers**: Receive mobile dispatch orders with supply manifests, route navigation, and live GPS tracking.
- **Admins**: Maintain cross-base strategic visibility and district-wide resource allocation.

---

## 🛑 The Problems Pukaar Solves

1. **Admin Fatigue vs. Operational Response**: Traditional platforms treat all operators as global administrators. Pukaar separates strategic oversight from **Relief Base Coordinators**, whose tools are built for high-speed local triage and field dispatching.
2. **Duplicate Rumors & Report Overload**: Crowdsourced reporting often floods responders with duplicate notifications for the same event. Pukaar clusters spatio-temporal duplicates (`< 300m`, `< 30 min`) so coordinators can merge them into a single verified incident.
3. **Blind Dispatches & Unaccounted Stock**: Responders are often sent without checking their skills or camp supplies. Pukaar enforces a **Tri-Link Mission Model** (`Incident ↔ Volunteer ↔ Supplies`), reserving and deducting inventory automatically.
4. **Transit Blindness**: Coordinators track volunteers via continuous high-frequency GPS telemetry, providing real-time radar, route corridors, and ETAs.

---

## 🏛️ Command Structure & Operational Hierarchy

```
                         ADMIN (Global / Regional Network)
                                      │
                         ┌────────────┴────────────┐
                     Base A                      Base B
                   COORDINATOR                 COORDINATOR
                  ┌──────┼──────┐            ┌──────┼──────┐
             Incidents  SOS   Resources  Incidents  SOS   Resources
                │                │          │                │
            Volunteers       Inventory  Volunteers       Inventory
```

### Role Matrix

| Role            | Interface                           | Primary Focus                                                                       |
| :-------------- | :---------------------------------- | :---------------------------------------------------------------------------------- |
| **Admin**       | Web (`/admin`)                      | Multi-base oversight, cross-camp resource rebalancing, and policy.                  |
| **Coordinator** | Web (`/dashboard`)                  | Tactical command: triage, incident verification, inventory, and volunteer dispatch. |
| **Volunteer**   | Mobile (`/volunteer`)               | Dispatch alerts, supply manifests, live GPS updates, and mission completion.        |
| **Citizen**     | Mobile (`/home`, `/report`, `/sos`) | 1-tap SOS distress beacons, photo incident reports, and shelter discovery.          |

---

## ⚡ Core Operational Flow

$$\text{New Report / SOS} \longrightarrow \text{Triage Queue} \longrightarrow \text{Verify \& Deduplicate} \longrightarrow \text{Set Priority}$$
$$\longrightarrow \text{Select Volunteer \& Supplies} \longrightarrow \text{Dispatch Order} \longrightarrow \text{Live GPS Tracking}$$
$$\longrightarrow \text{Arrived / On Scene} \longrightarrow \text{Resolved} \longrightarrow \text{Inventory \& Audit Updated}$$

---

## 🖥️ Coordinator Dashboard Modules

1. **Overview**: Real-time sector KPIs (Active Incidents, Critical SOS, Available Volunteers, Camp Resource Health), activity feed, and quick actions.
2. **Live Map**: Multi-layer GIS tactical map showing incidents, pulsating SOS beacons, safe camps, and real-time volunteer positions.
3. **Incidents**: Full verification pipeline, photo evidence viewer, priority elevation (`Low` to `Critical`), and duplicate merging.
4. **Assistance Requests / SOS**: High-priority distress queue displaying survivor count, emergency situation tags, and one-click dispatch.
5. **Volunteers**: Force roster, live availability (`Available`, `En Route`, `On Scene`, `Offline`), skill certifications, and vehicle types.
6. **Resources & Inventory**: Camp stock tracker with automated low-stock threshold alerts, reserve allocations, and audit transaction logs.
7. **Dispatches**: Active mission orders connecting incidents, assigned personnel, supply manifests, live transit corridors, and ETAs.
8. **Reports & Analytics**: Operational turnaround metrics (MTTV, MTTD, rescue times) and inventory burn-rate charts.
9. **Notifications**: Immediate audio-visual alerts for critical SOS signals, stock deficits, and volunteer updates.
10. **Profile & Settings**: Relief base operational configuration, alert preferences, and account security.

---

## 🛠️ Tech Stack & Monorepo Structure

```
pukaar/
├── apps/
│   ├── web/       ── Next.js 15, React 19, Tailwind CSS v4, Leaflet, Shadcn UI
│   └── mobile/    ── Expo SDK 57, React Native 0.86, Expo Router, Top Tabs
├── packages/
│   ├── backend/   ── Convex Reactive DB (real-time subscriptions, file storage)
│   ├── ui/        ── Shared component primitives
│   ├── eslint-config/
│   └── typescript-config/
```

- **Identity & Auth**: [Clerk](https://clerk.com/) with custom JWT template integration for Convex.
- **Database & Sync**: [Convex](https://convex.dev/) reactive backend providing ACID mutations and automatic WebSocket updates.

---

## 🚀 Quickstart & Local Setup

### 1. Install Dependencies

```bash
git clone https://github.com/raj-prasan/pukaar.git
cd pukaar
npm install
```

### 2. Environment Variables

- **`packages/backend/.env.local`**:
  ```env
  CONVEX_DEPLOYMENT=dev:your-deployment-name
  NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
  CLERK_ISSUER_URL=https://your-clerk-instance.clerk.accounts.dev
  ```
- **`apps/web/.env.local`**:
  ```env
  NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
- **`apps/mobile/.env`**:
  ```env
  EXPO_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  EXPO_PUBLIC_CLERK_JWT_TEMPLATE=convex
  ```

### 3. Run Development Servers

```bash
# Run Web, Mobile, and Backend simultaneously via Turborepo:
npm run dev
```

- **Web Dashboard**: `http://localhost:3000`
- **Mobile App**: Scan QR code in terminal using **Expo Go**, or press `a` (Android) / `i` (iOS).

---

## 📄 License

Open-source under the [MIT License](LICENSE).
