/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as building from "../building.js";
import type * as buildingStore from "../buildingStore.js";
import type * as demo from "../demo.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as letters from "../letters.js";
import type * as lib from "../lib.js";
import type * as mail from "../mail.js";
import type * as open from "../open.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  building: typeof building;
  buildingStore: typeof buildingStore;
  demo: typeof demo;
  files: typeof files;
  http: typeof http;
  letters: typeof letters;
  lib: typeof lib;
  mail: typeof mail;
  open: typeof open;
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

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
