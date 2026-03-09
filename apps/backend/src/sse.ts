import type { FastifyReply } from "fastify";

const clients = new Set<FastifyReply>();

export function addClient(reply: FastifyReply) {
  clients.add(reply);
  reply.raw.on("close", () => clients.delete(reply));
}

export function broadcast(event: string) {
  for (const client of clients) {
    client.raw.write(`data: ${event}\n\n`);
  }
}
