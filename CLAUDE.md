# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15 tour operator pricing calculator application for creating and managing tour quotes. Features authentication, database persistence via MySQL, complex pricing calculations with per-person and general expense categories, and master data management for hotels, meals, SIC tours, transfers, and sightseeing.

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
- **AI Integration**: Custom AI API (https://itinerary-ai.ruzgargucu.com) for itinerary generation

## Architecture

### Database Layer

- Connection pool configured in `lib/db.ts`
- Environment variables required:
  - Database: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
  - Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Main tables: `users`, `quotes`, `quote_days`, `quote_expenses`, `cities`, `hotels`, `hotel_pricing`, `restaurants`, `restaurant_menu_pricing`, `sic_tours`, `sic_tour_pricing`, `transfers`, `sightseeing_fees`
- Transactions used for multi-table operations (quote saves)
- All master data tables use user-scoped cities from `cities` table via `lib/cities.ts`

### City Management System

- **Location**: `lib/cities.ts`
- Cities are user-scoped with normalized names for deduplication
- **Key functions**:
  - `ensureCity(userId, rawName)` - Creates or returns existing city (auto-updates display name if normalized match exists)
  - `resolveCityId(userId, {cityId?, cityName?})` - Resolves city ID from either ID or name
  - `normalizeCityName(value)` - Lowercase, trimmed, single-spaced for matching
- Used by all master data tables (hotels, restaurants, SIC tours) via foreign key `city_id`

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

**Master Data Management (all user-scoped):**
- Hotels: CRUD at `/api/hotels`, pricing periods at `/api/hotels/[id]/pricing`
- Meals: CRUD at `/api/meals`, menu pricing at `/api/meals/[id]/menu`
- SIC Tours: CRUD at `/api/sic-tours`, pricing at `/api/sic-tours/[id]/pricing`
- Transfers: CRUD at `/api/transfers`
- Sightseeing: CRUD at `/api/sightseeing`
- Cities: GET/POST at `/api/cities` (returns user-specific cities)

**Itinerary Management:**
- `POST /api/generate-itinerary` - Generate AI descriptions for itinerary days using custom AI API
- `PUT /api/quotes/[id]/itinerary` - Save itinerary data (tour name, days, inclusions, exclusions, information)

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
- **Autocomplete integration**: Hotels, meals, SIC tours, and transfers fetch from master data APIs and auto-populate pricing based on selected dates

**State Management:**
- React useState for all form state (no external state library)
- useCallback for performance-critical update functions
- All expense items have unique IDs generated via `generateId()`

### URL Parameters

- `/pricing?load=<id>` - Edit existing quote (preserves quote ID for updates)
- `/pricing?copy=<id>` - Copy quote (clears ID, appends "- Copy" to name)

### Master Data Pages

Client-side pages at `/hotels`, `/meals`, `/sic-tours`, `/transfers`, `/sightseeing`:
- List/filter by city with autocomplete
- Inline editing with modals
- Nested pricing/menu management (hotels and meals have date-based pricing periods)
- City integration uses autocomplete with create-on-type functionality via `lib/cities.ts`
- All data is user-scoped - users only see their own master data

### Itinerary Builder

Located at `/itinerary?quote=<id>` (~1400 lines):

**Core Features:**
- AI-powered itinerary generation using custom AI API
- Professional PDF-ready layout with print optimization
- Editable tour name, duration, and day descriptions
- Auto-generated meal codes (B/L/D format)
- Hotel accommodation table by city with check-in/out dates
- Hotel options table showing all categories (3/4/5 star)
- Package rates table by PAX and hotel category
- Inclusions, exclusions, and important information sections

**AI Description Generation:**
- Context-aware descriptions for arrival, departure, city change, and regular days
- Differentiates between Private and SIC tour types
- Handles transfer modes (flight, airport, road)
- Mentions activities, meals, and transfers appropriately
- Uses custom AI endpoint (https://itinerary-ai.ruzgargucu.com) via `/api/generate-itinerary`

**Data Flow:**
1. Load quote via URL parameter → Extract hotel stays, pricing, and days
2. Generate AI descriptions for each day (if not previously saved)
3. Generate AI-powered tour title based on cities visited
4. Display editable itinerary with professional formatting
5. Save itinerary data back to quote via `PUT /api/quotes/[id]/itinerary`
6. Print/save as PDF using browser print functionality

**Print Optimization:**
- Custom CSS for A4 page size with optimized margins
- Page break handling to avoid splitting sections
- Hides navigation and action buttons when printing
- Professional layout with company logo and contact info

### Data Flow

**Quote Creation/Editing:**
1. User selects dates → Days auto-generated with empty expense items
2. User fills in expenses per day/category → Real-time calculations
3. Save quote → Transaction: insert quote → insert days → insert expenses
4. Load/Copy quote → Fetch full quote tree → Regenerate item IDs → Populate form

**Master Data with Autocomplete:**
1. User types in autocomplete field → Fetches matching items from API (filtered by city/date)
2. User selects item → Pricing auto-populated from master data pricing tables
3. Hotels/Meals: Pricing determined by matching date ranges in `hotel_pricing`/`restaurant_menu_pricing`

## Important Notes

- Port 3001 is used instead of default 3000 (configured in package.json scripts)
- All monetary values use 2 decimal precision
- Expense items with empty data (no location, description, or price) are filtered on save
- Each day must have at least one item per category (delete button disabled when length === 1)
- Date format: ISO strings for database, locale-formatted for display
- Private tours show guide/parking/accommodation expenses; SIC tours show only transfers
- City autocomplete creates new cities automatically if name doesn't exist (uses normalized matching)

## Workflow

**Typical quote-to-itinerary workflow:**
1. Create quote at `/pricing` → Fill in dates, expenses, pricing
2. Save quote → Redirects to `/quotes` (saved quotes list)
3. View/Edit/Copy quote options available on quotes list
4. Click "Itinerary" button → Opens `/itinerary?quote=<id>`
5. AI generates professional descriptions for each day
6. Edit itinerary content as needed
7. Save itinerary (stored with quote)
8. Print/save as PDF for client delivery

**Pages Overview:**
- `/dashboard` - Main dashboard with navigation to all sections
- `/pricing` - Quote creation and editing
- `/quotes` - List all saved quotes with actions (View, Edit, Copy, Itinerary, Delete)
- `/quotes/[id]` - View detailed quote breakdown
- `/itinerary?quote=<id>` - Generate and edit professional itinerary from quote
- `/hotels`, `/meals`, `/sic-tours`, `/transfers`, `/sightseeing` - Master data management
