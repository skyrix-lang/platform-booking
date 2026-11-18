import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import {
  bookingHistoryEntrySchema,
  bookingSchema,
  createBookingSchema,
  createPlatformSchema,
  platformSchema,
  trigramSchema,
  updateBookingSchema,
  updatePlatformSchema,
} from "@platform-booking/core";
import {
  createBooking,
  getBookingHistory,
  getBookings,
  lastBookableDay,
  releaseBooking,
  today,
  updateBookingEndDate,
} from "../bookings";
import { isDatabaseReachable } from "../health";
import { broadcast } from "../live-updates";
import {
  createPlatform,
  deletePlatform,
  getPlatform,
  getPlatforms,
  updatePlatform,
} from "../platforms";
import { getSessionUser } from "../session";

// The JSON API. Every route is declared with its schemas, which validate the
// request and make up the OpenAPI document (/api/openapi.json) that
// packages/api generates the web client from.
//
// The platforms and bookings are open to everyone who can reach the site, with
// no sign-in, as in the previous version: the team identifies itself by
// trigram (docs/decisions.md, "Open access, shared data"). Sign-in stays
// available (OIDC_*) for a feature that needs it: give such routes their own
// OpenAPIHono whose middleware checks `getSessionUser` (401 without one), as
// the starter's `userApi` does, and pass the user's id to its data functions.

const errorSchema = z
  .object({ error: z.string(), issues: z.array(z.unknown()).optional() })
  .meta({ id: "ApiErrorBody" });

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: errorSchema } },
});

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const jsonBody = <T extends z.ZodType>(schema: T) => ({
  body: { required: true, content: { "application/json": { schema } } },
});

const invalid = errorResponse("Invalid request");
const noContent = { description: "Done" };

// Any string: an unknown id is a platform that doesn't exist (404).
const platformParams = z.object({ id: z.string() });
const bookingParams = z.object({ platformId: z.string(), trigram: z.string() });

// ---------------------------------------------------------------- platforms

const listPlatformsRoute = createRoute({
  method: "get",
  path: "/platforms",
  operationId: "listPlatforms",
  responses: {
    200: json(z.array(platformSchema), "Every platform, by id"),
  },
});

const createPlatformRoute = createRoute({
  method: "post",
  path: "/platforms",
  operationId: "createPlatform",
  request: jsonBody(createPlatformSchema),
  responses: {
    201: json(platformSchema, "The new platform"),
    400: invalid,
    409: errorResponse("A platform with this id already exists"),
  },
});

const updatePlatformRoute = createRoute({
  method: "put",
  path: "/platforms/{id}",
  operationId: "updatePlatform",
  request: { params: platformParams, ...jsonBody(updatePlatformSchema) },
  responses: {
    200: json(platformSchema, "The updated platform"),
    400: invalid,
    404: errorResponse("No such platform"),
  },
});

const deletePlatformRoute = createRoute({
  method: "delete",
  path: "/platforms/{id}",
  operationId: "deletePlatform",
  request: { params: platformParams },
  responses: {
    204: { description: "Deleted; its bookings are released" },
    404: errorResponse("No such platform"),
  },
});

// ----------------------------------------------------------------- bookings

const listBookingsRoute = createRoute({
  method: "get",
  path: "/bookings",
  operationId: "listBookings",
  responses: {
    200: json(z.array(bookingSchema), "The active bookings"),
  },
});

const listBookingHistoryRoute = createRoute({
  method: "get",
  path: "/bookings/history",
  operationId: "listBookingHistory",
  responses: {
    200: json(
      z.array(bookingHistoryEntrySchema),
      "Bookings that ended in the last three weeks, the most recent first",
    ),
  },
});

const createBookingRoute = createRoute({
  method: "post",
  path: "/bookings",
  operationId: "createBooking",
  request: jsonBody(createBookingSchema),
  responses: {
    201: json(bookingSchema, "The new booking, from today"),
    400: errorResponse(
      "Invalid request, an end date in the past, or past today on a nightly platform",
    ),
    404: errorResponse("No such platform"),
    409: errorResponse("This trigram has already booked this platform"),
  },
});

const updateBookingRoute = createRoute({
  method: "patch",
  path: "/bookings/{platformId}/{trigram}",
  operationId: "updateBooking",
  request: { params: bookingParams, ...jsonBody(updateBookingSchema) },
  responses: {
    200: json(bookingSchema, "The booking with its new end date"),
    400: errorResponse(
      "Invalid request, an end date in the past, or past today on a nightly platform",
    ),
    404: errorResponse("No such booking"),
  },
});

const releaseBookingRoute = createRoute({
  method: "delete",
  path: "/bookings/{platformId}/{trigram}",
  operationId: "releaseBooking",
  request: { params: bookingParams },
  responses: {
    204: noContent,
    404: errorResponse("No such booking"),
  },
});

// ------------------------------------------------------------------ general

const meSchema = z
  .object({
    user: z
      .object({ email: z.string().nullable(), name: z.string().nullable() })
      .nullable(),
  })
  .meta({ id: "Me" });

const meRoute = createRoute({
  method: "get",
  path: "/me",
  operationId: "getMe",
  responses: {
    // 200 with null rather than 401: a page may ask on every load, and a 401
    // would be logged as an error by the browser.
    200: json(meSchema, "The signed-in user, or null"),
  },
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  responses: {
    200: json(z.object({ status: z.literal("ok") }), "The database answers"),
    503: json(z.object({ status: z.literal("unavailable") }), "It doesn't"),
  },
});

/** The end date `endDate` is refused for `platform`, or undefined if it's fine. */
function endDateProblem(endDate: string, platform: { nightly: boolean }) {
  if (endDate < today()) return "The end date can't be in the past";
  const last = lastBookableDay(platform);
  if (last && endDate > last) {
    return "Nightly platforms can only be booked for 1 day";
  }
  return undefined;
}

// Public on purpose: the site has no sign-in (see the top of this file).
const publicApi = new OpenAPIHono({
  // A request that fails its schema gets this API's error shape.
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "Invalid request", issues: result.error.issues },
        400,
      );
    }
  },
});

publicApi.use(async (c, next) => {
  await next();
  // Shared, changing data: never from a cache.
  c.header("Cache-Control", "no-store");
});

publicApi
  // For load balancers and uptime checks: it says only whether the app can
  // reach its database. 503 tells them to stop sending traffic.
  .openapi(healthRoute, async (c) =>
    (await isDatabaseReachable())
      ? c.json({ status: "ok" as const }, 200)
      : c.json({ status: "unavailable" as const }, 503),
  )
  .openapi(meRoute, async (c) => {
    const user = await getSessionUser(c);
    return c.json(
      { user: user ? { email: user.email, name: user.name } : null },
      200,
    );
  })

  .openapi(listPlatformsRoute, async (c) => c.json(await getPlatforms(), 200))
  .openapi(createPlatformRoute, async (c) => {
    const platform = await createPlatform(c.req.valid("json"));
    if (!platform) {
      return c.json({ error: "A platform with this id already exists" }, 409);
    }
    broadcast("platforms-updated");
    return c.json(platform, 201);
  })
  .openapi(updatePlatformRoute, async (c) => {
    const platform = await updatePlatform(
      c.req.valid("param").id,
      c.req.valid("json"),
    );
    if (!platform) return c.json({ error: "Platform not found" }, 404);
    broadcast("platforms-updated");
    return c.json(platform, 200);
  })
  .openapi(deletePlatformRoute, async (c) => {
    if (!(await deletePlatform(c.req.valid("param").id))) {
      return c.json({ error: "Platform not found" }, 404);
    }
    broadcast("platforms-updated");
    broadcast("bookings-updated");
    return c.body(null, 204);
  })

  .openapi(listBookingsRoute, async (c) => c.json(await getBookings(), 200))
  .openapi(listBookingHistoryRoute, async (c) =>
    c.json(await getBookingHistory(), 200),
  )
  .openapi(createBookingRoute, async (c) => {
    const input = c.req.valid("json");
    const platform = await getPlatform(input.platformId);
    if (!platform) return c.json({ error: "Platform not found" }, 404);
    const problem = endDateProblem(input.endDate, platform);
    if (problem) return c.json({ error: problem }, 400);
    const booking = await createBooking(input);
    // Deleted between the check above and the insert.
    if (booking === "missing") {
      return c.json({ error: "Platform not found" }, 404);
    }
    if (booking === "taken") {
      return c.json(
        { error: "This trigram has already booked this platform" },
        409,
      );
    }
    broadcast("bookings-updated");
    return c.json(booking, 201);
  })
  .openapi(updateBookingRoute, async (c) => {
    const { platformId, trigram } = c.req.valid("param");
    const { endDate } = c.req.valid("json");
    const platform = await getPlatform(platformId);
    const owner = trigramSchema.safeParse(trigram);
    if (!platform || !owner.success) {
      return c.json({ error: "Booking not found" }, 404);
    }
    const problem = endDateProblem(endDate, platform);
    if (problem) return c.json({ error: problem }, 400);
    const booking = await updateBookingEndDate(platformId, owner.data, endDate);
    if (!booking) return c.json({ error: "Booking not found" }, 404);
    broadcast("bookings-updated");
    return c.json(booking, 200);
  })
  .openapi(releaseBookingRoute, async (c) => {
    const { platformId, trigram } = c.req.valid("param");
    const owner = trigramSchema.safeParse(trigram);
    if (!owner.success || !(await releaseBooking(platformId, owner.data))) {
      return c.json({ error: "Booking not found" }, 404);
    }
    broadcast("bookings-updated");
    return c.body(null, 204);
  });

export const api = new OpenAPIHono();
api.route("/", publicApi);

/** The OpenAPI document for this API, with paths under /api. */
export function openApiDocument() {
  const document = new OpenAPIHono();
  document.route("/api", api);
  return document.getOpenAPI31Document({
    openapi: "3.1.0",
    info: { title: "Platform Booking API", version: "1.0.0" },
  });
}
