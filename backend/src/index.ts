import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bookings } from "./routes/bookings.js";
import { platforms } from "./routes/platforms.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
  }),
);

app.route("/api/platforms", platforms);
app.route("/api/bookings", bookings);

app.get("/api/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3001;
console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
