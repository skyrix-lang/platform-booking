import Fastify from "fastify";
import cors from "@fastify/cors";
import { type HealthResponse } from "@booking/shared";
import { platformsRoutes } from "./routes/platforms.js";
import { bookingsRoutes } from "./routes/bookings.js";
import { addClient } from "./sse.js";

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

fastify.get("/api/events", (_request, reply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  reply.raw.write("\n");
  addClient(reply);
  reply.hijack();
});

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
