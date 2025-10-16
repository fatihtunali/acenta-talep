# AI Travel Planner - Design Guidelines

## Design Approach: Reference-Based (Travel Industry Leaders)

**Primary References:** Airbnb's visual storytelling, Booking.com's clarity, Expedia's information architecture

**Design Philosophy:** Create an aspirational yet functional travel planning experience that builds trust through clean design, clear pricing, and AI-powered personalization. The interface should feel premium without being overwhelming, professional without being corporate.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 14 88% 45% (Deep teal - trust, travel, professionalism)
- Background: 0 0% 100% (Pure white)
- Surface: 210 20% 98% (Soft gray for cards)
- Text Primary: 220 18% 20% (Near black)
- Text Secondary: 220 10% 45% (Medium gray)
- Success: 142 76% 36% (Confirmed bookings)
- Accent: 25 95% 53% (Warm orange for CTAs - energy, adventure)

**Dark Mode:**
- Primary: 14 85% 55% (Lighter teal)
- Background: 220 18% 12% (Deep navy-gray)
- Surface: 220 15% 18% (Elevated surfaces)
- Text Primary: 0 0% 95% (Off-white)
- Text Secondary: 220 10% 65% (Light gray)

### B. Typography

**Font Stack:**
- Primary: 'Inter' (Google Fonts) - Clean, modern, excellent readability
- Accent: 'Playfair Display' (Google Fonts) - Elegant headers for premium feel

**Scale:**
- Hero: text-5xl md:text-6xl font-bold (Playfair Display)
- Section Headers: text-3xl md:text-4xl font-semibold (Playfair Display)
- Card Titles: text-xl font-semibold (Inter)
- Body: text-base leading-relaxed (Inter)
- Small Text: text-sm (Inter)

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistency
- Component padding: p-6 md:p-8
- Section spacing: py-16 md:py-24
- Card gaps: gap-6
- Form fields: space-y-4

**Grid System:**
- Container: max-w-7xl mx-auto px-4 md:px-6
- Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Itinerary layout: Two-column on desktop (sidebar + content)

### D. Component Library

**Navigation:**
- Fixed header with blur backdrop (backdrop-blur-md bg-white/90)
- Logo left, primary CTA right
- Clean, minimal navigation links

**Hero Section:**
- Full-width with aspirational travel imagery (exotic destination)
- Overlay gradient (from-black/60 to-transparent)
- Centered headline + subheadline
- Input form embedded or CTA to scroll to form

**Input Form:**
- Clean card design with shadow-lg
- Progressive disclosure (show relevant fields based on selections)
- Date pickers, dropdown selectors, number inputs
- Large, prominent "Generate Itinerary" button (accent color)

**Hotel Cards:**
- Image-first design (16:9 ratio)
- Overlay with price badge (top-right)
- Star rating, amenities icons
- "Select" button with hover state

**Itinerary Display:**
- Timeline view with day markers
- Expandable sections per day
- Time slots with activities
- Color-coded categories (hotel, sightseeing, transport)

**Price Breakdown:**
- Sticky sidebar on desktop
- Itemized list with subtle dividers
- Total with emphasis (larger font, primary color)
- "Download PDF" and "Book Now" CTAs

**Trust Elements:**
- AI badge ("Powered by AI" with subtle animation)
- Customer testimonials with photos
- Security badges in footer

### E. Visual Details

**Cards & Surfaces:**
- rounded-xl for all cards
- shadow-md for standard cards, shadow-xl for emphasized
- border border-gray-100 for subtle separation

**Buttons:**
- Primary: Full accent color, white text, font-semibold, py-3 px-6
- Secondary: outline variant with primary color border
- On images: blur backdrop (backdrop-blur-md bg-white/20) with white text

**Images:**
- Hero: Large, high-quality destination image (beach, mountains, or cityscape)
- Hotel cards: Professional property photos
- Sightseeing: Attraction imagery
- Use object-cover for consistent aspect ratios

**Transitions:**
- Hover states: scale-105 transform, transition-all duration-200
- Card reveals: Fade in with stagger effect on load
- Minimal page transitions, no heavy animations

---

## Page Structure

**Landing/Home:**
1. Hero with travel imagery and tagline
2. How it works (3-step process with icons)
3. Sample itineraries carousel
4. Testimonials (2-column grid)
5. CTA section with form preview
6. Footer with links, social proof

**Itinerary Builder (Main App):**
1. Sticky header with progress indicator
2. Input form section (highlighted)
3. Results area (hotels, sightseeing, transport in tabs or sequential)
4. Price summary (sticky sidebar on desktop, fixed bottom on mobile)
5. Final itinerary view with print/PDF options

---

## Images

- **Hero Image:** Exotic tropical beach at sunset or vibrant city skyline (full-width, 70vh height)
- **Hotel Cards:** Professional property photography showcasing rooms and facilities
- **Destination Cards:** Iconic landmarks and attractions for each city
- **How It Works Section:** Illustrated icons or simple graphics (no photos needed)
- **Testimonials:** Real user photos (circular crop, 80x80px)

All images should convey aspiration, wanderlust, and premium quality while maintaining fast load times through optimization.