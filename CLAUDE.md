# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15 tour operator pricing calculator application for creating and managing tour quotes. Features authentication, database persistence via MySQL, and complex pricing calculations with per-person and general expense categories.

## Development Commands

- **Dev server**: `npm run dev` (runs on port 3001 with Turbopack)
- **Build**: `npm build` (uses Turbopack)
- **Production**: `npm start` (runs on port 3001)
- **Lint**: `npm run lint`

## Tech Stack

- **Framework**: Next.js 15.5.4 with App Router and Turbopack
- **UI**: React 19.1.0, Tailwind CSS 4
- **Auth**: NextAuth.js v4 with credentials provider
- **Database**: MySQL via mysql2 with connection pooling
- **Password Hashing**: bcryptjs

## Architecture

### Database Layer

- Connection pool configured in `lib/db.ts`
- Environment variables required: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- Schema includes: `users`, `quotes`, `quote_days`, `quote_expenses` tables
- Transactions used for multi-table operations (quote saves)

### Authentication

- Route: `app/api/auth/[...nextauth]/route.ts`
- Strategy: JWT-based sessions
- Custom callbacks extend session with `role` and `id`
- Protected routes check session status via `useSession()` hook
- SessionProvider wraps app in `app/providers.tsx`

### API Routes

**Quote Management:**
- `POST /api/quotes` - Create new quote (requires authentication)
- `GET /api/quotes` - List all quotes for current user
- `GET /api/quotes/[id]` - Load specific quote with all days/expenses
- `PUT /api/quotes/[id]` - Update existing quote
- `DELETE /api/quotes/[id]` - Delete quote

All routes use `getServerSession(authOptions)` for authentication.

### Core Pricing Logic

Located in `app/pricing/page.tsx` (~1045 lines):

**Expense Categories:**
- **Per Person**: hotelAccommodation, meals, entranceFees, sicTourCost (SIC only), tips
- **General** (divided by PAX): transportation, guide, guideDriverAccommodation, parking

**Key Features:**
- Dynamic day generation based on date range
- Two transport pricing modes: 'total' cost or 'per vehicle' (qty × price)
- Supports both Private and SIC tour types (different expense categories)
- Markup and tax calculations applied to final totals
- PAX slabs table shows pricing at different group sizes (1, 2, 4, 6, 8, 10, 15, 20)
- Quote save/load/copy functionality with URL parameters (?load=id or ?copy=id)

**State Management:**
- React useState for all form state (no external state library)
- useCallback for performance-critical update functions
- All expense items have unique IDs generated via `generateId()`

### URL Parameters

- `/pricing?load=<id>` - Edit existing quote (preserves quote ID for updates)
- `/pricing?copy=<id>` - Copy quote (clears ID, appends "- Copy" to name)

### Data Flow

1. User selects dates → Days auto-generated with empty expense items
2. User fills in expenses per day/category → Real-time calculations
3. Save quote → Transaction: insert quote → insert days → insert expenses
4. Load/Copy quote → Fetch full quote tree → Regenerate item IDs → Populate form

## Important Notes

- Port 3001 is used instead of default 3000 (configured in package.json scripts)
- All monetary values use 2 decimal precision
- Expense items with empty data (no location, description, or price) are filtered on save
- Each day must have at least one item per category (delete button disabled when length === 1)
- Date format: ISO strings for database, locale-formatted for display
- Private tours show guide/parking/accommodation expenses; SIC tours show only transfers
