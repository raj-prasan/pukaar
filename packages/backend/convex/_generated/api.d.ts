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
import type * as private_incidents from "../private/incidents.js";
import type * as private_reports from "../private/reports.js";
import type * as private_users from "../private/users.js";
import type * as public_assistanceRequest from "../public/assistanceRequest.js";
import type * as public_incidents from "../public/incidents.js";
import type * as public_reports from "../public/reports.js";
import type * as public_sos from "../public/sos.js";
import type * as public_users from "../public/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "private/auth": typeof private_auth;
  "private/incidents": typeof private_incidents;
  "private/reports": typeof private_reports;
  "private/users": typeof private_users;
  "public/assistanceRequest": typeof public_assistanceRequest;
  "public/incidents": typeof public_incidents;
  "public/reports": typeof public_reports;
  "public/sos": typeof public_sos;
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
