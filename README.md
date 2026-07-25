# solar-ai

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Express, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Express** - Fast, unopinionated web framework
- **tRPC** - End-to-end type-safe APIs
- **Node.js** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

4. (Optional) Seed the Bella Salon demo:

```bash
pnpm run db:seed
```

- Email: `demo@bellasalon.com`
- Password: `BellaDemo2026!`
- Public call: [http://localhost:3001/call/bella-receptionist-en](http://localhost:3001/call/bella-receptionist-en)
- Embed smoke page: [http://localhost:3001/embed-demo.html](http://localhost:3001/embed-demo.html)

Then, run the development server:

```bash
pnpm run dev
```

The API is running at [http://localhost:3000](http://localhost:3000). The web app is at [http://localhost:3001](http://localhost:3001).

## Deployment

### Docker Compose

- Target: server
- Config: `docker-compose.yml` (app Dockerfiles live in `apps/*/Dockerfile`)
- Build images: pnpm run docker:build
- Start: pnpm run docker:up
- Logs: pnpm run docker:logs
- Stop: pnpm run docker:down

Environment variables are read from each app's `.env` file (baked into web builds for public variables) and overridden in `docker-compose.yml` for container networking.

For more details, see the guide on [Deploying with Docker Compose](https://www.better-t-stack.dev/docs/guides/docker).

## Project Structure

```
solar-ai/
├── apps/
│   └── server/      # Backend API (Express, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run db:seed`: Seed Bella Salon demo user, agent, FAQs, and booking slots
- `pnpm run docker:build`: Build the Docker Compose images
- `pnpm run docker:up`: Build and start the Docker Compose stack
- `pnpm run docker:logs`: Tail logs from the Docker Compose stack
- `pnpm run docker:down`: Stop the Docker Compose stack
