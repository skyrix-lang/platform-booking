import { FastifyPluginAsync } from "fastify";
import {
  type Booking,
  type CreateBookingRequest,
  type DeleteBookingRequest,
  type DeleteBookingResponse,
  type ErrorResponse,
  type Platform,
  isValidTrigram,
  toISODate,
} from "@booking/shared";
import platformsConfig from "@booking/shared/platforms" with { type: "json" };
import { getAllBookings, createBooking, deleteBooking } from "../db.js";
import { broadcast } from "../sse.js";

const platformMap = new Map<string, Platform>(
  (platformsConfig as { platforms: Platform[] }).platforms.map((p) => [p.id, p]),
);

export const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: Booking[] }>("/", async () => {
    return getAllBookings();
  });

  fastify.post<{ Body: CreateBookingRequest; Reply: Booking | ErrorResponse }>(
    "/",
    async (request, reply) => {
      const { platformId, trigram, endDate } = request.body;

      if (!platformId || !trigram || !endDate) {
        return reply
          .status(400)
          .send({ error: "platformId, trigram, and endDate are required" });
      }

      if (!isValidTrigram(trigram)) {
        return reply
          .status(400)
          .send({ error: "Trigram must be exactly 3 letters" });
      }

      const platform = platformMap.get(platformId);
      if (platform?.nightly && endDate > toISODate(new Date())) {
        return reply
          .status(400)
          .send({ error: "Nightly platforms can only be booked for 1 day" });
      }

      const booking = createBooking(platformId, trigram, endDate);
      broadcast("bookings-updated");
      return reply.status(201).send(booking);
    },
  );

  fastify.delete<{
    Params: DeleteBookingRequest;
    Reply: DeleteBookingResponse | ErrorResponse;
  }>("/:platformId", async (request, reply) => {
    const { platformId } = request.params;
    const deleted = deleteBooking(platformId);

    if (!deleted) {
      return reply.status(404).send({ error: "Booking not found" });
    }

    broadcast("bookings-updated");
    return { ok: true };
  });
};
