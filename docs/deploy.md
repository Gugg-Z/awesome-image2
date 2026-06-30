# Deployment

Production runs fully in Docker Compose. Local development can keep using the existing workflow:

```bash
docker compose up -d postgres
pnpm dev
```

## Production Setup

1. Copy the production environment template and change secrets:

```bash
cp .env.production.example .env
```

Set at least these values before the first run:

```bash
POSTGRES_USER="promptbay"
POSTGRES_PASSWORD="replace-with-a-strong-database-password"
POSTGRES_DB="promptbay"
APP_PORT="3000"
NEXTAUTH_URL="https://your-domain.example"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
AUTH_REQUIRED="true"
DEMO_LOGIN_ENABLED="false"
ADMIN_EMAIL="admin@pb.me"
ADMIN_PASSWORD="replace-with-a-strong-admin-password"
ADMIN_NAME="PromptBay Admin"
```

2. Build and start production containers:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The production stack contains:

- `postgres`: PostgreSQL with persistent Docker volume `postgres-data`.
- `web`: Next.js app container with persistent upload volume `app-uploads`.

## First Deploy

On the first web container start, `docker-entrypoint.sh` runs:

- `pnpm exec prisma generate`
- `pnpm exec prisma db push`
- `node scripts/seed-admin.mjs`

This creates the database table structure from `prisma/schema.prisma` and creates the admin user from `.env`.

## Updates

For normal project updates, run:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Existing data is not overwritten because:

- PostgreSQL data is stored in the named Docker volume `postgres-data`.
- Uploaded/generated local files are stored in the named Docker volume `app-uploads`.
- `prisma db push` updates schema shape but does not drop all data during normal additive changes.
- `seed-admin` only upserts the configured admin user. It does not truncate tables or reseed prompt data.

Do not run `docker compose down -v` in production unless you intentionally want to delete Docker volumes and data.

## Admin Account

The admin account is not randomly generated. It comes from `.env`:

```bash
ADMIN_EMAIL="admin@pb.me"
ADMIN_PASSWORD="replace-with-a-strong-admin-password"
ADMIN_NAME="PromptBay Admin"
```

So the login is:

- Email: the value of `ADMIN_EMAIL`
- Password: the value of `ADMIN_PASSWORD`

To see the configured admin email on the server:

```bash
grep '^ADMIN_EMAIL=' .env
```

For security, the app only stores a password hash. You cannot recover the old admin password from the database. To reset it, change `ADMIN_PASSWORD` in `.env` and restart:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The next web container start will update that admin user's password.
