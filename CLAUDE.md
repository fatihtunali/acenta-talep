# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI-powered travel itinerary generator that creates personalized travel packages with hotels, sightseeing, transportation, and day-by-day itineraries using a custom AI endpoint. Built with React/TypeScript frontend, Express backend, and MySQL database.

## Development Commands

- **Dev server**: `npm run dev` (starts Express + Vite on port 5000)
- **Build**: `npm run build` (Vite build + esbuild for server)
- **Production**: `npm start` (runs built server from `dist/`)
- **Type check**: `npm run check`

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS 4, Wouter (routing), TanStack Query
- **Backend**: Express.js, Node.js
- **Database**: MySQL with direct mysql2 driver
- **AI**: Custom AI endpoint (https://itinerary-ai.ruzgargucu.com)
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

**IMPORTANT**: The app runs on the port specified in `process.env.PORT` or defaults to 5000. The Express server serves both API routes and the Vite-built client.

### Request Flow

1. **Development**: Express → Vite dev middleware → React HMR
2. **Production**: Express → Serve static files from `dist/public/` → React SPA
3. API requests always go to `/api/*` endpoints handled by Express

### Database Tables

The application uses MySQL with three main tables:
- **sessions** - Session storage for future authentication implementation
- **users** - User accounts (for future use)
- **trip_packages** - Generated travel packages with JSON columns for complex data

### Database Schema

**Tables:**
- `sessions` - Session storage with sid, sess (JSON), expire timestamp
- `users` - User accounts (id, email, first_name, last_name, profile_image_url)
- `trip_packages` - Generated travel packages with JSON columns:
  - trip_request (JSON) - User input data
  - hotel (JSON) - Selected hotel details
  - sightseeing (JSON) - Array of activities
  - transportation (JSON) - Array of transport options
  - itinerary (JSON) - Day-by-day schedule
  - pricing (JSON) - Price breakdown

**Key Pattern**: Complex nested data stored as JSON for flexibility

### AI Service Pattern

Located in `server/ai-service.ts`:

1. **API Integration**: Calls custom AI endpoint at `https://itinerary-ai.ruzgargucu.com/generate-itinerary`
2. **Request Format**: Sends trip request data (destination, nights, dates, travelers, budget, preferences)
3. **Response Parsing**: Handles JSON response, strips markdown code blocks if present
4. **Data Transformation**: Adds UUIDs to generated items, calculates pricing (subtotal + 8% tax)
5. **Error Handling**: Catches API errors, provides user-friendly messages

**Endpoint Configuration**: Can be overridden via `AI_ENDPOINT` environment variable

## API Endpoints

- `POST /api/generate-itinerary` - Generate AI travel package
  - Request body: TripRequest schema (destination, nights, dates, travelers, budget, preferences)
  - Returns: `{ success: true, package: TripPackage }`
  - Saves package to database automatically

- `GET /api/trip-packages` - List all saved packages
  - Returns: `{ success: true, packages: TripPackage[] }`

- `GET /api/trip-packages/:id` - Get specific package by ID
  - Returns: `{ success: true, package: TripPackage }`

All API routes defined in `server/routes.ts` via `registerRoutes(app)`.

## Shared Schema System

**Critical**: `shared/schema.ts` contains:
1. Zod validation schemas (runtime validation)
2. TypeScript types (compile-time type safety)
3. Database table schemas (for reference)

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

- `DATABASE_URL` - MySQL connection string (optional if using direct connection params)
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `DB_PORT` - MySQL port (default: 3306)
- `AI_ENDPOINT` - Custom AI API endpoint (default: https://itinerary-ai.ruzgargucu.com)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - "development" or "production"

## Important Notes

- Vite dev server only runs in development (`NODE_ENV=development`)
- Production serves static files from `dist/public/`
- All routes except `/api/*` fall through to React SPA (client-side routing)
- AI endpoint can be customized via `AI_ENDPOINT` environment variable
- Tax calculation: 8% on subtotal
- Trip packages saved to database automatically after generation
- No authentication required - all users can generate and view packages

## Development Workflow

1. Make changes to client or server code
2. Vite HMR updates frontend instantly in dev mode
3. Backend changes require manual restart (tsx watches files)
4. Database schema changes: update SQL tables directly in MySQL
5. Test AI generation with various inputs (destinations, budgets, preferences)

## Database Operations Pattern

Located in `server/storage.ts`:

```typescript
// Save trip package
await storage.saveTripPackage(tripPackage)

// Get all packages
await storage.getAllTripPackages()

// Get specific package
await storage.getTripPackage(id)
```

All use direct MySQL queries with prepared statements for security.
