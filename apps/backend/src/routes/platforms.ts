import { FastifyPluginAsync } from "fastify";
import { type Platform, type ErrorResponse } from "@booking/shared";
import {
  getAllPlatforms,
  getPlatform,
  createPlatform,
  updatePlatform,
  deletePlatform,
} from "../db.js";
import { broadcast } from "../sse.js";

export const platformsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: Platform[] }>("/", async () => {
    return getAllPlatforms();
  });

  fastify.post<{ Body: Platform; Reply: Platform | ErrorResponse }>(
    "/",
    async (request, reply) => {
      const { id, description, kubernetes, nightly } = request.body;

      if (!id || typeof id !== "string") {
        return reply.status(400).send({ error: "id is required" });
      }

      if (getPlatform(id)) {
        return reply.status(409).send({ error: "Platform already exists" });
      }

      const platform = createPlatform({ id, description, kubernetes, nightly });
      broadcast("platforms-updated");
      return reply.status(201).send(platform);
    },
  );

  fastify.put<{ Params: { id: string }; Body: Platform; Reply: Platform | ErrorResponse }>(
    "/:id",
    async (request, reply) => {
      const { id: currentId } = request.params;
      const { id, description, kubernetes, nightly } = request.body;

      if (!getPlatform(currentId)) {
        return reply.status(404).send({ error: "Platform not found" });
      }

      if (id !== currentId && getPlatform(id)) {
        return reply.status(409).send({ error: "A platform with this id already exists" });
      }

      updatePlatform(currentId, { id, description, kubernetes, nightly });
      broadcast("platforms-updated");
      return { id, description, kubernetes, nightly };
    },
  );

  fastify.delete<{ Params: { id: string }; Reply: { ok: boolean } | ErrorResponse }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;
      const deleted = deletePlatform(id);

      if (!deleted) {
        return reply.status(404).send({ error: "Platform not found" });
      }

      broadcast("platforms-updated");
      return { ok: true };
    },
  );
};
