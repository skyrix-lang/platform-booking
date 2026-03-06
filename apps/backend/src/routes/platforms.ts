import { FastifyPluginAsync } from "fastify";
import { type Platform } from "@booking/shared";
import platformsConfig from "@booking/shared/platforms";

export const platformsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: Platform[] }>("/", async () => {
    return platformsConfig.platforms as Platform[];
  });
};
