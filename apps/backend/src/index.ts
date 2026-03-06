import Fastify from "fastify";
import cors from "@fastify/cors";
import { type HealthResponse } from "@booking/shared";
import { platformsRoutes } from "./routes/platforms.js";
import { bookingsRoutes } from "./routes/bookings.js";

const fastify = Fastify({
  logger: true,
});

const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [
  "http://localhost:5173",
];

await fastify.register(cors, {
  origin: allowedOrigins,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
});

fastify.register(platformsRoutes, { prefix: "/api/platforms" });
fastify.register(bookingsRoutes, { prefix: "/api/bookings" });

fastify.get<{ Reply: HealthResponse }>("/api/health", async () => {
  return { status: "ok" };
});

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";

try {
  await fastify.listen({ port, host });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
