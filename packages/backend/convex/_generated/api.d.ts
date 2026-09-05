/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as private_auth from "../private/auth.js";
import type * as private_camps from "../private/camps.js";
import type * as private_dispatches from "../private/dispatches.js";
import type * as private_incidents from "../private/incidents.js";
import type * as private_inventory from "../private/inventory.js";
import type * as private_reports from "../private/reports.js";
import type * as private_users from "../private/users.js";
import type * as private_volumteerLocations from "../private/volumteerLocations.js";
import type * as public_assistanceRequest from "../public/assistanceRequest.js";
import type * as public_camps from "../public/camps.js";
import type * as public_files from "../public/files.js";
import type * as public_incidents from "../public/incidents.js";
import type * as public_map from "../public/map.js";
import type * as public_reports from "../public/reports.js";
import type * as public_sos from "../public/sos.js";
import type * as public_teams from "../public/teams.js";
import type * as public_users from "../public/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "private/auth": typeof private_auth;
  "private/camps": typeof private_camps;
  "private/dispatches": typeof private_dispatches;
  "private/incidents": typeof private_incidents;
  "private/inventory": typeof private_inventory;
  "private/reports": typeof private_reports;
  "private/users": typeof private_users;
  "private/volumteerLocations": typeof private_volumteerLocations;
  "public/assistanceRequest": typeof public_assistanceRequest;
  "public/camps": typeof public_camps;
  "public/files": typeof public_files;
  "public/incidents": typeof public_incidents;
  "public/map": typeof public_map;
  "public/reports": typeof public_reports;
  "public/sos": typeof public_sos;
  "public/teams": typeof public_teams;
  "public/users": typeof public_users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
