# Deployment

Deploying this version in place of the previous one, the Docker image, later deploys, backups and logs.

## Deploy

This version runs as three services, `docker/compose.production.yaml`:
Postgres, a migration step, and the app. The app answers on port 80, as
before, so your HTTPS proxy keeps pointing at the same place. The app
speaks plain HTTP: keep it behind that proxy, which must set
`X-Forwarded-For`.

## Settings: `docker/.env`

On the server, in this repository:

```bash
cp docker/.env.example docker/.env
chmod 600 docker/.env
openssl rand -hex 24   # paste it as POSTGRES_PASSWORD
```

Then fill in `docker/.env`. It needs only three values:

| Setting             | What to put                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | the https address people type, such as `https://booking.example.com`                                      |
| `POSTGRES_PASSWORD` | a new password, letters and digits only (the `openssl` output). Keep it: the database keeps the first one |
| `TZ`                | the team's time zone, such as `Europe/Paris`: a booking ends at midnight there                            |

Compared with the previous version's `.env`:

| Before                                 | Now                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| `CORS_ORIGINS`                         | `PUBLIC_URL`                                          |
| `FRONTEND_PORT=80`                     | `APP_PORT`, 80 by default: leave it out               |
| `DB_PATH`                              | gone: the data moves to Postgres, `POSTGRES_PASSWORD` |
| `VITE_API_URL`, `BACKEND_PORT`, `HOST` | gone: one container serves the site and the API       |
| (none)                                 | `TZ`                                                  |

Nothing else: sign-in stays off, as before. Compose reads `docker/.env` for
every `docker compose -f docker/compose.production.yaml` command; git and
image builds ignore it.

## Replace the previous container

Find the old container and its data volume: `docker ps` and
`docker volume ls`. With the old README's `docker run`, the volume is
`booking-data`; with its compose file, there are two containers (`frontend`
and `backend`) and the volume is `<folder>_backend-data`. Replace
`<old container>` and `booking-data` below with yours.

Run the steps one by one, and go on only when one succeeds:

```bash
docker compose -f docker/compose.production.yaml build

# 1. The database, the migrations and the default platforms.
docker compose -f docker/compose.production.yaml run --rm migrate

# 2. Stop the previous container (both, with its compose file), so nothing
#    changes during the copy, then import its data (platforms, active
#    bookings, history) from its volume.
docker stop <old container>
docker compose -f docker/compose.production.yaml run --rm \
  -v booking-data:/legacy:ro migrate yarn db:import-sqlite /legacy/booking.db

# 3. Start the app on port 80 in its place.
docker compose -f docker/compose.production.yaml up -d
docker compose -f docker/compose.production.yaml ps   # app: "healthy"
```

The import opens the old file read-only and prints what it copied, and what it
skipped and why (a row with an invalid date, a duplicate). It reads the
file's write-ahead log too, so the last bookings made before the stop are
there. Bookings of a platform that no longer exists go to the history as
released. It refuses to run when Postgres already holds bookings or history,
so it can't duplicate anything. When the old file has a platforms table (any
version that could edit platforms), its list replaces the default one;
otherwise the defaults stay. A platform id the new site can't use in a URL
(with a slash or a space) is skipped, and its bookings go to the history; so
is an active booking whose trigram isn't three letters.

## Going back

Keep the stopped old container and its volume until you've checked the new
site: never `docker compose down -v` in the old version's folder, which
deletes the volume. To go back, `docker compose -f
docker/compose.production.yaml stop app` and `docker start <old container>`:
the old data is as it was at the stop, and changes made on the new site since
are not in it. Once you're sure, `docker rm` the old container, and remove
its volume when you no longer want it as a backup.

## Later deploys

`git pull`, then
`docker compose -f docker/compose.production.yaml up -d --build`: the
`migrate` service applies new migrations before the app starts, and adds the
default platforms only to an empty table.

## The image

`yarn docker:build` builds the app image alone, and its `migrate` stage
(`--target migrate`) is the migration step.

The runtime image holds Node, a single bundled `server.js` and the static
files: no `node_modules`, no package manager, and it runs as a non-root user.
Its base image is pinned by digest, and Renovate updates it. The image has a
`HEALTHCHECK` on `GET /api/health` (503 when the database is unreachable), and
on `SIGTERM` the server finishes the requests in progress before it exits.

To try the image locally, `yarn docker:up` runs `docker/compose.yaml`:
Postgres, the migrations and the app at http://localhost:8080. Its password is
public: it isn't a deployment.

## Deploying

Off until a project turns it on: the starter ships the scripts, and nothing
deploys anywhere until you run `yarn deploy` or set the Deploy workflow's
`DEPLOY_SSH` variable. [docs/auto-deploy.md](auto-deploy.md) is the
step-by-step setup (Claude can follow it).

> **Not wired up in this project yet.** The scripts below come from the
> starter and expect an [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy)
> setup with a shared Postgres on its `nginx-proxy` network. This project's
> `docker/compose.production.yaml` is the self-contained stack described in
> [Deploy](#deploy) (its own Postgres, port 80), so `yarn deploy` and the
> nightly workflow won't work with it as is. Adapting them is a decision to
> take before setting `DEPLOY_SSH`.

The starter's `docker/compose.production.yaml` runs the image on a server (a
VPS with Docker) behind an nginx-proxy with its Let's Encrypt companion, on the
proxy's `nginx-proxy` network, which also reaches a shared Postgres as
`postgres`. The app must be served over https.

One-time setup on the server, in the deploy folder (`apps/platform-booking`
in the deploy user's home by default; `DEPLOY_DIR` changes it):

1. Create a database and its user in Postgres. The user must **own** the
   database: a restore drops and creates the `public` schema.
2. `.env.production`, readable by its owner only, with the production values
   of `.env.example` (its "Production" section lists the extra ones):

   ```bash
   mkdir -p ~/apps/platform-booking && install -m 600 /dev/null ~/apps/platform-booking/.env.production && nano ~/apps/platform-booking/.env.production
   ```

3. `backup.env`, for the backups (see "Backups" below): no deploy runs
   without it.

Then, for each release, from a checkout of the commit to ship:

```bash
DEPLOY_SSH=<user>@<server> DEPLOY_PORT=<port> yarn deploy
```

`scripts/deploy.sh` copies the commit to the server (no git there), then
`scripts/deploy-remote.sh`:

1. builds the new image while the old version still serves people, keeping
   the running one as `platform-booking-app:previous`;
2. stops the app, so nothing is written from the backup on;
3. backs the database up and proves the backup (see "Backups"). If that
   fails, the old version starts again and nothing is migrated;
4. applies the migrations, then starts the new version and waits for its
   health check.

Then `yarn deploy` checks the public address (the server's `PUBLIC_URL`, or
`DEPLOY_URL`): `/api/health` and `/` must answer over https within about a
minute.

**Rollback.** When step 4 fails, or the public address doesn't answer,
`scripts/rollback-remote.sh` puts back both halves and the deploy fails:

- **the database**, from the backup of step 3, if a migration ran since (it
  compares how many migrations the database has applied with the count
  before the deploy). The app was stopped since the backup, so nothing is
  lost;
- **the app**: `platform-booking-app:previous` starts again.

By hand, right after a failed deploy:
`ssh -p <port> <user>@<server> 'cd apps/platform-booking/src && sh scripts/rollback-remote.sh'`.

## Backups

`scripts/backup-remote.sh` dumps the database (`pg_dump` with the server's
own Postgres version), restores the dump into a throwaway Postgres and
compares its tables (and, before a deploy, every table's row count), uploads
it to a Cloudflare R2 bucket and checks R2 holds all of it. It runs before
every deploy, and every night once automatic deploys are on. The last 7 also
stay on the server, in `apps/platform-booking/backups`.

One-time setup:

1. **Cloudflare dashboard:** R2 → **Create bucket** (`platform-booking-backups`,
   location automatic). In its Settings → **Object lifecycle rules**, delete
   objects after 30 days. Then R2 → **Manage API tokens** → **Create API
   token**: **Object Read & Write**, on that bucket only. Keep the Access Key
   ID, the Secret Access Key and your Account ID (R2's overview page, or the
   part before `.r2.cloudflarestorage.com` in the S3 endpoint).
2. **On the server**, next to `.env.production`, from the template
   `docker/backup.env.example`:

   ```bash
   install -m 600 /dev/null ~/apps/platform-booking/backup.env && nano ~/apps/platform-booking/backup.env
   ```

   ```bash
   R2_ACCOUNT_ID=<account id>
   R2_BUCKET=platform-booking-backups
   AWS_ACCESS_KEY_ID=<access key id>
   AWS_SECRET_ACCESS_KEY=<secret access key>
   ```

3. **Try it**, once a deploy has copied the scripts there:

   ```bash
   ssh -p <port> <user>@<server> 'cd apps/platform-booking/src && sh scripts/backup-remote.sh'
   ```

   It ends with `Backup OK: … tables restored and checked, in R2.`

**Restoring by hand**, with the latest backup or one you name (download an
older one from R2 into `apps/platform-booking/backups` first). The app is
stopped and left stopped; the restore is one transaction, so a failed one
changes nothing:

```bash
ssh -p <port> <user>@<server> 'cd apps/platform-booking/src && sh scripts/restore-remote.sh ../backups/platform-booking-<date>.dump'
```

Then start the version that matches the data:
`docker compose -f docker/compose.production.yaml up -d --no-build app`.

## Deploying automatically

`.github/workflows/deploy.yml` runs every night, around 02:00 Paris time,
called by the nightly once its checks are done (docs/development.md, "The
nightly"): it deploys the commit the nightly checked if every check passed
and the server doesn't run it yet, and otherwise backs the database up. **Run workflow** in the Actions tab
deploys `main` at once. It does nothing, in the starter and in any project,
until the `DEPLOY_SSH` repository variable is set. Turning it on (a deploy
key, the `production` environment, two secrets and a variable):
[docs/auto-deploy.md](auto-deploy.md).

## Logs

The BFF writes one line per event to stdout, and warnings and errors to
stderr: JSON in the image, readable text in development. Each request is one
line with its method, path (never the query string), status and duration,
except health checks that succeed. Its id is returned as `x-request-id` and
added to everything logged while handling it; a proxy that sends
`x-request-id` keeps its own id. Errors are logged with their message, code
and stack only: query parameters and whatever a library attached to them are
dropped. Log with `log` from `apps/bff/src/log.ts`; lint refuses `console`.

CI builds the image on `main` and on tags and pushes it to the GitHub container
registry, with an SBOM and build provenance, and signs release tags with
cosign. See `SECURITY.md`. Nothing deploys it: running it is up to you.
