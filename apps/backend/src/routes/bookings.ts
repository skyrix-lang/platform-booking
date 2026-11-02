import { FastifyPluginAsync } from "fastify";
import {
  type Booking,
  type BookingHistory,
  type BookingParams,
  type CreateBookingRequest,
  type DeleteBookingResponse,
  type ErrorResponse,
  type UpdateBookingRequest,
  isValidISODate,
  isValidTrigram,
  toISODate,
} from "@booking/shared";
import {
  getAllBookings,
  createBooking,
  updateBookingEndDate,
  deleteBooking,
  getBookingHistory,
  getPlatform,
} from "../db.js";
import { broadcast } from "../sse.js";

export const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: Booking[] }>("/", async () => {
    return getAllBookings();
  });

  fastify.get<{ Reply: BookingHistory[] }>("/history", async () => {
    const since = new Date();
    since.setDate(since.getDate() - 21);
    return getBookingHistory(since.toISOString());
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

      const platform = getPlatform(platformId);
      if (platform?.nightly && endDate > toISODate(new Date())) {
        return reply
          .status(400)
          .send({ error: "Nightly platforms can only be booked for 1 day" });
      }

      const booking = createBooking(platformId, trigram, endDate);
      if (!booking) {
        return reply
          .status(409)
          .send({ error: "This trigram has already booked this platform" });
      }

      broadcast("bookings-updated");
      return reply.status(201).send(booking);
    },
  );

  fastify.patch<{
    Params: BookingParams;
    Body: UpdateBookingRequest;
    Reply: Booking | ErrorResponse;
  }>("/:platformId/:trigram", async (request, reply) => {
    const { platformId, trigram } = request.params;
    const endDate = request.body?.endDate;

    if (typeof endDate !== "string" || !isValidISODate(endDate)) {
      return reply
        .status(400)
        .send({ error: "endDate must be a valid YYYY-MM-DD date" });
    }

    const today = toISODate(new Date());
    if (endDate < today) {
      return reply.status(400).send({ error: "endDate cannot be in the past" });
    }

    if (getPlatform(platformId)?.nightly && endDate > today) {
      return reply
        .status(400)
        .send({ error: "Nightly platforms can only be booked for 1 day" });
    }

    const booking = updateBookingEndDate(platformId, trigram, endDate);
    if (!booking) {
      return reply.status(404).send({ error: "Booking not found" });
    }

    broadcast("bookings-updated");
    return booking;
  });

  fastify.delete<{
    Params: BookingParams;
    Reply: DeleteBookingResponse | ErrorResponse;
  }>("/:platformId/:trigram", async (request, reply) => {
    const { platformId, trigram } = request.params;
    const deleted = deleteBooking(platformId, trigram);

    if (!deleted) {
      return reply.status(404).send({ error: "Booking not found" });
    }

    broadcast("bookings-updated");
    return { ok: true };
  });
};
