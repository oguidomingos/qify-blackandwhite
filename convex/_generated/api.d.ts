/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agentConfigurations from "../agentConfigurations.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as businessProfiles from "../businessProfiles.js";
import type * as contacts from "../contacts.js";
import type * as google from "../google.js";
import type * as messages from "../messages.js";
import type * as organizationSettings from "../organizationSettings.js";
import type * as organizations from "../organizations.js";
import type * as sessions from "../sessions.js";
import type * as syncStatus from "../syncStatus.js";
import type * as webhooks from "../webhooks.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agentConfigurations: typeof agentConfigurations;
  ai: typeof ai;
  auth: typeof auth;
  businessProfiles: typeof businessProfiles;
  contacts: typeof contacts;
  google: typeof google;
  messages: typeof messages;
  organizationSettings: typeof organizationSettings;
  organizations: typeof organizations;
  sessions: typeof sessions;
  syncStatus: typeof syncStatus;
  webhooks: typeof webhooks;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
