# Acenta-Talep Project Progress

**Last Updated:** 2025-10-15
**Current Status:** Multi-Agency System with Two-Tier Pricing - OPERATIONAL ✅

## 🎯 Project Goal

Transform the pricing application into a multi-agency B2B platform where:
1. **Operator (You)** manages master data and sets operational prices
2. **Agencies** add their markup and create quotes for clients
3. **White-label** outputs with each agency's branding
4. **Two-tier pricing**: Operator cost + Agency markup = Client price

---

## ✅ Completed Features (October 15, 2025)

### 1. Multi-Agency Database Schema
**Status:** ✅ COMPLETE

**Tables Created:**
- `agencies` - Agency information, branding, default markup
  - company_name, contact_person, email, phone, website, address
  - logo_url, primary_color, secondary_color
  - default_markup_percentage, currency
  - status (active/inactive/suspended)
  - subscription_type (free/basic/premium/enterprise)

- `users` table updated:
  - `agency_id` - Links user to agency
  - `user_role` - admin, agency_owner, agency_user, operator

- `quotes` table updated:
  - `agency_id` - Links quote to agency
  - `quote_status` - draft, sent, accepted, rejected, expired, confirmed
  - `client_name`, `client_email`, `client_phone` - Client information
  - `markup_percentage` - Agency's profit margin
  - `final_price` - Final price to client
  - `sent_at`, `responded_at`, `confirmed_at` - Status tracking
  - `notes` - Additional notes

- `quote_markup_history` - Audit trail for markup changes
- `agency_branding_assets` - Multiple logos/assets per agency

**Migration File:** `migrations/007_create_multi_agency_system.sql`

**Sample Data:**
- System Admin agency (ID: 1)
- Funny Tourism (ID: 2) - Fatih Tunali - 15% default markup - Premium
- Diler Travel Agency (ID: 3) - 12% markup - Basic
- Gül Tourism (ID: 4) - 10% markup - Basic

### 2. Agency Management APIs
**Status:** ✅ COMPLETE

**Endpoints:**
- `GET /api/agencies` - List all (admin) or get own agency (users)
- `POST /api/agencies` - Create new agency (admin only)
- `GET /api/agencies/[id]` - Get single agency
- `PUT /api/agencies/[id]` - Update agency (owner/admin)
- `DELETE /api/agencies/[id]` - Delete agency (admin only)

**Features:**
- Role-based access control
- Agency owners can update their own agency
- Admin can see and manage all agencies
- Validation and error handling

**Files:**
- `app/api/agencies/route.ts`
- `app/api/agencies/[id]/route.ts`

### 3. Agency Settings Page
**Status:** ✅ COMPLETE

**Location:** `/agency-settings`

**Features:**
- Company Information (name, contact, email, phone, website, address, city)
- White-Label Branding:
  - Logo URL input
  - Primary color picker
  - Secondary color picker
- Pricing Settings:
  - Default markup percentage
  - Currency selection (USD, EUR, GBP, TRY)
- Subscription Info (read-only):
  - Status badge (active/inactive/suspended)
  - Plan badge (free/basic/premium/enterprise)
- Save/Cancel actions

**File:** `app/agency-settings/page.tsx`

**Dashboard Integration:** Added "Agency Settings" link on dashboard

### 4. Two-Tier Pricing System
**Status:** ✅ COMPLETE

**Pricing Structure:**
```
Base Cost (hotels, meals, transfers, etc.)
  + Cost Markup (operator's profit margin)
  = After Markup
  + Tax
  = Operator Price (what operator charges agency)
  + Agency Markup (agency's profit margin)
  = Final Client Price
```

**Implementation:**
- Added `agencyMarkup` state to pricing page
- New input field "Agency Markup %" with blue border
- Calculation updates:
  - `afterTax` = subtotal + markup + tax
  - `agencyMarkupAmount` = afterTax × (agencyMarkup / 100)
  - `grandTotal` = afterTax + agencyMarkupAmount

**UI Updates:**
- Summary breakdown shows all pricing tiers
- "Cost Markup" (green) vs "Agency Markup" (blue)
- "Operator Price" line item
- Conditional display of agency markup (only if > 0)
- Dynamic label: "Final Client Price" vs "Grand Total"

**Files Modified:**
- `app/pricing/page.tsx` - Added agencyMarkup state and calculations

### 5. Quotes API Updates
**Status:** ✅ COMPLETE

**Changes:**
- `SaveQuoteRequest` interface updated with `agencyMarkup?: number`
- INSERT statement includes `markup_percentage` field
- UPDATE statement includes `markup_percentage` field
- GET endpoints return `markup_percentage` and `agencyMarkup`
- Backward compatibility: supports both field names

**Files:**
- `app/api/quotes/route.ts` - POST (create) and GET (list)
- `app/api/quotes/[id]/route.ts` - GET (single), PUT (update)

### 6. Server Deployment
**Status:** ✅ OPERATIONAL

**Environment:**
- Server: 188.132.230.193
- User: acenta (password: Dlr235672.-Yt)
- Location: `/home/acenta/acenta-talep`
- Port: 3002
- Process: next-server (PID updates on each restart)

**Database:**
- Host: localhost
- User: acenta
- Password: Dlr235672.-Yt
- Database: acenta_talep
- All migrations applied successfully

**URLs:**
- Application: http://188.132.230.193:3002
- GitHub: https://github.com/fatihtunali/acenta-talep.git

**Environment Variables (.env):**
```
DB_HOST=localhost
DB_USER=acenta
DB_PASSWORD=Dlr235672.-Yt
DB_NAME=acenta_talep
DB_PORT=3306
NEXTAUTH_URL=http://188.132.230.193:3002
NEXTAUTH_SECRET=[generated]
FUNNY_AI_URL=http://31.141.246.227:8000
```

---

## 🔧 Technical Details

### Port Configuration
- **Local Development:** Port 3002 (changed from 3001)
- **Production Server:** Port 3002
- **Config Files:** `package.json` scripts section

### Repository Structure
- **Main Repo:** `acenta-talep` (development - port 3002)
- **Production Repo:** `pricing` (production - port 3001, unchanged)
- **Note:** These are now separate - changes to acenta-talep won't affect pricing

### Database Relationships
```
agencies (1) → (many) users
agencies (1) → (many) quotes
users (1) → (many) quotes
quotes (1) → (many) quote_days
quote_days (1) → (many) quote_expenses
agencies (1) → (many) agency_branding_assets
quotes (1) → (many) quote_markup_history
```

### User Roles & Permissions
- **admin** - System admin, can manage all agencies
- **agency_owner** - Can update their agency settings
- **agency_user** - Regular agency user, read-only agency access
- **operator** - Tour operator role (future use)

---

## 🚀 How the System Works

### For Operator (You)
1. Manage master data (hotels, meals, SIC tours, transfers, sightseeing)
2. Set "Cost Markup %" on quotes (your operational profit)
3. Apply tax
4. **Operator Price** = cost + markup + tax
5. This is your selling price to agencies

### For Agencies
1. Agency owner sets up agency in Settings (logo, colors, default markup)
2. Agency creates quotes using your master data
3. Agency sees "Operator Price" (your price to them)
4. Agency adds "Agency Markup %" (their profit)
5. **Final Client Price** = Operator Price + Agency Markup
6. Agency presents this final price to their client

### Pricing Example
```
Hotel (3 nights @ €100) = €300
Meals = €150
Transfers = €50
Total Base Cost = €500

Cost Markup (10%) = €50
After Markup = €550

Tax (8%) = €44
Operator Price = €594 ← What you charge the agency

Agency Markup (15%) = €89.10
Final Client Price = €683.10 ← What agency charges client
```

---

## 📋 Next Steps (To Be Implemented)

### Priority 1: Quote Status Management
**Goal:** Track quote lifecycle from creation to confirmation

**Features:**
- Status badges on quotes list (draft, sent, accepted, rejected, confirmed)
- Status change buttons
- Email notifications when status changes
- History tracking in quote_markup_history

**Files to Update:**
- `app/quotes/page.tsx` - Add status badges and filter
- Create status change API endpoints
- Add email notification system

### Priority 2: Client Information Fields
**Goal:** Store client details with quotes

**Features:**
- Client name, email, phone on quote form
- Display on quote view page
- Include in itinerary exports

**Files to Update:**
- `app/pricing/page.tsx` - Add client info inputs
- `app/quotes/[id]/page.tsx` - Display client info
- Database already has fields (client_name, client_email, client_phone)

### Priority 3: Quick Quote Request Form
**Goal:** Simplified form for quick quotes

**Features:**
- City selection + nights (e.g., "3 nights Istanbul + 2 nights Cappadocia")
- Date range picker
- PAX count
- Auto-suggest hotels based on city/dates
- Auto-calculate pricing
- One-click quote creation

**New Page:** `/quick-quote`

### Priority 4: White-Label PDF/DOCX Export
**Goal:** Each agency's itinerary with their branding

**Features:**
- Use agency logo from agency settings
- Use agency colors for headers/accents
- Agency contact info in footer
- Replace "Funny Tourism" with agency name
- Customizable template per agency

**Files to Update:**
- `lib/export-docx.ts` - Add agency branding parameters
- `app/itinerary/page.tsx` - Pass agency data to export
- Fetch agency data when exporting

### Priority 5: Agency User Management
**Goal:** Multiple users per agency

**Features:**
- Agency owner can invite users
- User roles within agency (owner, manager, user)
- Permission management
- User list page for agency

**New Pages:**
- `/agency-users` - Manage users
- User invitation system

---

## 🐛 Known Issues & Fixes

### Issue 1: Agency Settings Not Loading
**Problem:** "No agency found" error initially
**Cause:** Session.user.role was "admin" but code expected different response format
**Fix:** Updated `app/agency-settings/page.tsx` to handle both `agency` and `agencies` response
**Status:** ✅ RESOLVED

### Issue 2: Port Conflict (3001)
**Problem:** Port 3001 already in use by pricing app
**Cause:** Copied from pricing repo which uses 3001
**Fix:** Changed package.json to use port 3002
**Status:** ✅ RESOLVED

### Issue 3: TypeScript Errors in Agency API
**Problem:** Type mismatch with session.user
**Cause:** Next-auth types expect string id, we used number assertions
**Fix:** Changed to `parseInt(session.user.id)` instead of type assertion
**Status:** ✅ RESOLVED

---

## 📝 Development Notes

### Database Migration Process
1. Create migration file in `/migrations` directory
2. Test on server: `mysql -u acenta -p'password' acenta_talep < migration.sql`
3. Verify tables: `SHOW TABLES;` and `DESCRIBE table_name;`
4. Check data: `SELECT * FROM agencies;`

### Deployment Process
1. Local: Develop and test
2. Commit: `git add . && git commit -m "message"`
3. Push: `git push origin main`
4. Server: `git pull origin main`
5. Build: `npm run build` (only for page/component changes)
6. Restart: `kill [PID] && npm start > app.log 2>&1 &`
7. Verify: `netstat -tlnp | grep 3002`

### Debugging Tips
- Server logs: `tail -f /home/acenta/acenta-talep/app.log`
- Database: `mysql -u acenta -p'Dlr235672.-Yt' acenta_talep`
- Process: `ps aux | grep next-server`
- Port: `netstat -tlnp | grep 3002`
- Console logs: Add `console.log('[Component] message', data)`

---

## 🔐 Access Information

### Database Users
- **Root:** Password in `/root/.my.cnf`
- **acenta:** Password: `Dlr235672.-Yt`
- **ruzgargucu:** Password: `Dlr235672.-Yt` (pricing db)

### System Users
- **fatihtunali@gmail.com** - Fatih Tunali - Agency: Funny Tourism (ID: 2)
- **dilertunali@gmail.com** - Diler Tunali - Agency: Diler Travel (ID: 3)
- **gulakburak@funnytourism.com** - Gül Akburak - Agency: Gül Tourism (ID: 4)

### Funny AI Service
- **URL:** http://31.141.246.227:8000
- **Alternative:** https://itinerary-ai.ruzgargucu.com
- **Model:** Mistral 7B
- **Purpose:** AI-powered itinerary generation

---

## 📚 Important Files Reference

### Configuration
- `package.json` - Scripts, dependencies, port config (3002)
- `.env` - Environment variables (not in git)
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration

### Database
- `lib/db.ts` - Database connection pool
- `lib/cities.ts` - City management utilities
- `migrations/007_create_multi_agency_system.sql` - Latest migration

### Authentication
- `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `types/next-auth.d.ts` - NextAuth type definitions
- `app/providers.tsx` - SessionProvider wrapper

### Core Features
- `app/pricing/page.tsx` - Main pricing calculator (~1100 lines)
- `app/itinerary/page.tsx` - AI itinerary builder (~1500 lines)
- `app/quotes/page.tsx` - Saved quotes list
- `app/quotes/[id]/page.tsx` - Quote detail view
- `app/dashboard/page.tsx` - Main dashboard

### APIs
- `app/api/quotes/route.ts` - Quotes CRUD (list, create)
- `app/api/quotes/[id]/route.ts` - Quote operations (get, update, delete)
- `app/api/agencies/route.ts` - Agencies list/create
- `app/api/agencies/[id]/route.ts` - Agency operations
- `app/api/hotels/route.ts` - Hotels master data
- `app/api/meals/route.ts` - Meals master data
- `app/api/sic-tours/route.ts` - SIC tours master data
- `app/api/transfers/route.ts` - Transfers master data
- `app/api/sightseeing/route.ts` - Sightseeing fees

### Documentation
- `CLAUDE.md` - Claude Code instructions
- `FUNNY-AI-README.md` - Funny AI documentation
- `README.md` - Standard Next.js readme
- `PROGRESS.md` - This file

---

## 💡 Tips for Tomorrow

1. **Before starting:** Read this file to remember context
2. **Check server:** Verify app is running on port 3002
3. **Test agency settings:** Login and check Funny Tourism agency
4. **Test pricing:** Create a quote with both markups
5. **Database:** Remember markup is in `markup` field, agency markup in `markup_percentage`

---

## 🎯 Success Metrics

- ✅ Multi-agency system operational
- ✅ Agency settings page working
- ✅ Two-tier pricing calculating correctly
- ✅ Quotes saving agency markup
- ✅ Server deployed and stable
- ✅ All users have agencies
- ✅ No critical bugs

**System is production-ready for basic use!** 🎉

---

*Last session ended: October 15, 2025 - 6:30 PM*
*Next session: October 16, 2025 - Morning*
*Status: All systems operational - Ready for next features*
