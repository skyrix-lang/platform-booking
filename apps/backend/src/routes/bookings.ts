import { FastifyPluginAsync } from "fastify";
import {
  type Booking,
  type CreateBookingRequest,
  type DeleteBookingRequest,
  type DeleteBookingResponse,
  type ErrorResponse,
  isValidTrigram,
} from "@booking/shared";
import { getAllBookings, createBooking, deleteBooking } from "../db.js";

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

      const booking = createBooking(platformId, trigram, endDate);
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

    return { ok: true };
  });
};
