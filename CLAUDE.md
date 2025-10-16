# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI-powered travel itinerary generator that creates personalized travel packages with hotels, sightseeing, transportation, and day-by-day itineraries using OpenAI's GPT-4. Built with React/TypeScript frontend, Express backend, PostgreSQL database, and Replit authentication.

## Development Commands

- **Dev server**: `npm run dev` (starts Express + Vite on port 5000)
- **Build**: `npm run build` (Vite build + esbuild for server)
- **Production**: `npm start` (runs built server from `dist/`)
- **Type check**: `npm run check`
- **Database push**: `npm run db:push` (push Drizzle schema to PostgreSQL)

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS 4, Wouter (routing), TanStack Query
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Auth**: Replit OpenID Connect (Google, GitHub, X, Apple, email/password)
- **AI**: OpenAI API via Replit AI Integrations (gpt-4o-mini)
- **UI Library**: Shadcn UI with Radix UI primitives
- **Build**: Vite (client), esbuild (server)

## Architecture

### Full-Stack Monorepo Structure

```
client/src/          # React frontend
  components/        # UI components (Shadcn + custom)
  pages/            # Page components (home, etc.)
  lib/              # Client utilities
  App.tsx           # Root component with routing

server/             # Express backend
  index.ts          # Server entry, middleware, port config
  routes.ts         # API endpoints registration
  ai-service.ts     # OpenAI integration for itinerary generation
  storage.ts        # Database operations (trip packages, users)
  db.ts             # Drizzle connection to PostgreSQL
  replitAuth.ts     # OpenID Connect authentication setup
  vite.ts           # Vite dev server integration

shared/
  schema.ts         # Zod schemas + TypeScript types + Drizzle tables
```

### Port Configuration

**IMPORTANT**: The app ALWAYS runs on the port specified in `process.env.PORT` or defaults to 5000. This is the only port that is not firewalled in Replit environments. The Express server serves both API routes and the Vite-built client.

### Request Flow

1. **Development**: Express → Vite dev middleware → React HMR
2. **Production**: Express → Serve static files from `dist/public/` → React SPA
3. API requests always go to `/api/*` endpoints handled by Express

### Authentication Flow

- Uses Replit OpenID Connect via `replitAuth.ts`
- Session storage in PostgreSQL `sessions` table
- Middleware `isAuthenticated` protects routes requiring auth
- User data stored in `users` table (Replit `sub` claim as primary key)
- Trip packages associated with `userId` (nullable for unauthenticated users)

### Database Schema (Drizzle ORM)

**Tables:**
- `sessions` - Express session storage (Replit Auth)
- `users` - User accounts (id, email, firstName, lastName, profileImageUrl)
- `trip_packages` - Generated travel packages (userId FK, trip details as JSONB)

**Key Pattern**: Complex nested data (hotel, sightseeing, transportation, itinerary) stored as JSONB for flexibility.

**Relations**: `users` → many `trip_packages`

### AI Service Pattern

Located in `server/ai-service.ts`:

1. **Prompt Engineering**: Detailed prompt instructs GPT-4 to generate structured JSON
2. **Response Parsing**: Handles markdown code blocks, validates JSON structure
3. **Data Transformation**: Adds UUIDs to generated items, calculates pricing (subtotal + 8% tax)
4. **Error Handling**: Catches OpenAI errors, provides user-friendly messages

**Important**: OpenAI is instructed to return ONLY JSON (no markdown). Code defensively strips markdown code blocks if present.

## API Endpoints

- `POST /api/generate-itinerary` - Generate AI travel package (req.body: TripRequest schema)
  - Optionally authenticated (userId from session if logged in)
  - Returns: `{ success: true, package: TripPackage }`

- `GET /api/trip-packages` - List all saved packages (no auth required currently)

- `GET /api/trip-packages/:id` - Get specific package by ID

- `GET /api/auth/user` - Get current authenticated user (requires `isAuthenticated`)

All API routes defined in `server/routes.ts` via `registerRoutes(app)`.

## Shared Schema System

**Critical**: `shared/schema.ts` is the single source of truth for:
1. Zod validation schemas (runtime validation)
2. TypeScript types (compile-time type safety)
3. Drizzle database table definitions

**Main Types:**
- `TripRequest` - User input (destination, dates, nights, travelers, budget, preferences)
- `Hotel` - Accommodation with category (budget/moderate/luxury), pricing, amenities
- `Sightseeing` - Activities with categories (cultural, adventure, nature, etc.)
- `Transportation` - Transfers and transport (airport-transfer, car-rental, local-transport, intercity)
- `ItineraryDay` - Day-by-day schedule with timed activities
- `TripPackage` - Complete package with all components + pricing breakdown

## Design System

Follows travel industry best practices (Airbnb, Booking.com inspiration).

**Color Palette (HSL):**
- Primary: `14 88% 45%` (deep teal - trust, professionalism)
- Accent: `25 95% 53%` (warm orange - CTAs, energy, adventure)
- Backgrounds: Pure white (light mode), `220 18% 12%` (dark mode)

**Typography:**
- Body: Inter (Google Fonts)
- Headers: Playfair Display (serif, premium feel)

**Component Patterns:**
- Cards: `rounded-xl shadow-md border`
- Buttons: Primary uses accent color, secondary uses outline
- Hero: Full-width image with overlay gradient
- Forms: Progressive disclosure, large CTAs

See `design_guidelines.md` for complete visual specifications.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required, auto-provisioned by Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (Replit AI Integrations)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - "development" or "production"

## Important Notes

- Vite dev server only runs in development (`NODE_ENV=development`)
- Production serves static files from `dist/public/`
- All routes except `/api/*` fall through to React SPA (client-side routing)
- OpenAI model used: `gpt-4o-mini` (cost-effective, fast)
- Temperature: `0.8` (balance between creativity and consistency)
- Max tokens: `3000` (sufficient for detailed itineraries)
- Tax calculation: 8% on subtotal
- Trip packages can be saved without authentication (userId nullable)

## Development Workflow

1. Make changes to client or server code
2. Vite HMR updates frontend instantly in dev mode
3. Backend changes require manual restart (tsx watches files)
4. Drizzle schema changes: update `shared/schema.ts` → run `npm run db:push`
5. Test AI generation with various inputs (destinations, budgets, preferences)

## Database Operations Pattern

Located in `server/storage.ts`:

```typescript
// Save trip package (with or without user)
await storage.saveTripPackage(tripPackage, userId?)

// Get all packages
await storage.getAllTripPackages()

// Get specific package
await storage.getTripPackage(id)

// Upsert user (auth callback)
await storage.upsertUser(userData)
```

All use Drizzle ORM query builder for type safety.
