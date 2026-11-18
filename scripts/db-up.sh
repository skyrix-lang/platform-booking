#!/bin/sh
# Starts the local Postgres container, creating it on first use, and waits for it.
set -e

docker start platform-booking-db >/dev/null 2>&1 || docker run -d --name platform-booking-db \
  -e POSTGRES_USER=platform_booking \
  -e POSTGRES_PASSWORD=platform_booking \
  -e POSTGRES_DB=platform_booking \
  -p 5432:5432 \
  -v platform-booking-db:/var/lib/postgresql \
  postgres:18-alpine >/dev/null

# Over TCP: during first-time setup Postgres only listens on a local socket.
until docker exec platform-booking-db pg_isready -q -h 127.0.0.1 -U platform_booking; do
  sleep 1
done
