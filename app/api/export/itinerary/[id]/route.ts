import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  mealCode: string;
  description: string;
}

interface SavedItinerary {
  tourName: string;
  duration: string;
  days: ItineraryDay[];
  inclusions: string;
  exclusions: string;
  information: string;
}

interface QuoteRow extends RowDataPacket {
  id: number;
  quote_name: string;
  category: string;
  season_name: string | null;
  valid_from: string | null;
  valid_to: string | null;
  start_date: string;
  end_date: string;
  tour_type: string;
  pax: number;
  pricing_table: string;
  itinerary_data: string | null;
  user_id: number;
}

// Removed HotelRow interface - using RowDataPacket directly

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractDestinations(days: ItineraryDay[]): string {
  const cities = new Set<string>();
  days.forEach(day => {
    // Extract city from title like "Day 1 - Istanbul" or "Day 4 - Istanbul - Fly - Cappadocia"
    const titleParts = day.title.split(' - ');
    if (titleParts.length > 1) {
      // Get all city parts (excluding "Day X", "Fly", "Departure", etc)
      titleParts.slice(1).forEach(part => {
        const cleaned = part.trim();
        if (cleaned && !['Fly', 'Departure', 'Arrival'].includes(cleaned)) {
          cities.add(cleaned);
        }
      });
    }
  });
  return Array.from(cities).join(', ');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const quoteId = Number.parseInt(id, 10);

    if (!Number.isFinite(quoteId)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }

    const userId = Number.parseInt(session.user.id, 10);

    // Get quote with itinerary data
    const [quoteRows] = await pool.execute<QuoteRow[]>(
      `SELECT * FROM quotes WHERE id = ? AND user_id = ?`,
      [quoteId, userId]
    );

    if (quoteRows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = quoteRows[0];

    if (!quote.itinerary_data) {
      return NextResponse.json(
        { error: 'Itinerary not generated yet. Please generate itinerary first.' },
        { status: 400 }
      );
    }

    // Parse itinerary data
    const itinerary: SavedItinerary = JSON.parse(quote.itinerary_data);

    // Parse pricing table
    const pricingTable = JSON.parse(quote.pricing_table);

    // Get hotels from quote expenses (simplified - just get unique hotel names)
    const [hotelRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT qe.description as hotel_name
      FROM quote_days qd
      LEFT JOIN quote_expenses qe ON qd.id = qe.quote_day_id AND qe.category = 'hotelAccommodation'
      WHERE qd.quote_id = ? AND qe.description IS NOT NULL AND qe.description != ''`,
      [quoteId]
    );

    // Build hotels object - group by star category based on hotel names
    const hotels: { threestar?: string[]; fourstar?: string[]; fivestar?: string[] } = {};

    hotelRows.forEach(row => {
      if (row.hotel_name) {
        const hotelName = row.hotel_name;
        if (hotelName.includes('3 star') || hotelName.includes('3 Star') || hotelName.includes('3-star')) {
          if (!hotels.threestar) hotels.threestar = [];
          if (!hotels.threestar.includes(hotelName)) hotels.threestar.push(hotelName);
        } else if (hotelName.includes('4 star') || hotelName.includes('4 Star') || hotelName.includes('4-star')) {
          if (!hotels.fourstar) hotels.fourstar = [];
          if (!hotels.fourstar.includes(hotelName)) hotels.fourstar.push(hotelName);
        } else {
          // Default to 5 star
          if (!hotels.fivestar) hotels.fivestar = [];
          if (!hotels.fivestar.includes(hotelName)) hotels.fivestar.push(hotelName);
        }
      }
    });

    // Build pricing object matching Funny Tourism format
    const paxTiers: Record<string, {
      threestar: { double: number; triple: number; singleSupplement: number };
      fourstar: { double: number; triple: number; singleSupplement: number };
      fivestar: { double: number; triple: number; singleSupplement: number };
    }> = {};

    pricingTable.forEach((tier: {
      pax: number;
      categories: {
        '3 stars': { adultPerPerson: number; singleSupplement: number };
        '4 stars': { adultPerPerson: number; singleSupplement: number };
        '5 stars': { adultPerPerson: number; singleSupplement: number };
      };
    }) => {
      paxTiers[tier.pax.toString()] = {
        threestar: {
          double: Math.round(tier.categories['3 stars'].adultPerPerson),
          triple: Math.round(tier.categories['3 stars'].adultPerPerson),
          singleSupplement: Math.round(tier.categories['3 stars'].singleSupplement)
        },
        fourstar: {
          double: Math.round(tier.categories['4 stars'].adultPerPerson),
          triple: Math.round(tier.categories['4 stars'].adultPerPerson),
          singleSupplement: Math.round(tier.categories['4 stars'].singleSupplement)
        },
        fivestar: {
          double: Math.round(tier.categories['5 stars'].adultPerPerson),
          triple: Math.round(tier.categories['5 stars'].adultPerPerson),
          singleSupplement: Math.round(tier.categories['5 stars'].singleSupplement)
        }
      };
    });

    // Format itinerary days for Funny Tourism
    const formattedItinerary = itinerary.days.map(day => ({
      day: day.dayNumber,
      title: day.title.replace(/^Day \d+ - /, ''), // Remove "Day X - " prefix
      description: day.description,
      meals: day.mealCode.replace(/[()]/g, '') // Remove parentheses from meal code
    }));

    // Extract highlights from itinerary descriptions
    const highlights: string[] = [];
    itinerary.days.forEach(day => {
      if (day.description.includes('Bosphorus Cruise')) {
        highlights.push('Bosphorus Cruise experience');
      }
      if (day.description.includes('Hagia Sophia')) {
        highlights.push('Visit to Hagia Sophia');
      }
      if (day.description.includes('Blue Mosque')) {
        highlights.push('Blue Mosque tour');
      }
      if (day.description.includes('Topkapi Palace')) {
        highlights.push('Topkapi Palace exploration');
      }
      if (day.description.includes('Ephesus')) {
        highlights.push('Ancient city of Ephesus');
      }
      if (day.description.includes('Pamukkale')) {
        highlights.push('Pamukkale white terraces');
      }
      if (day.description.includes('Cappadocia')) {
        highlights.push('Cappadocia fairy chimneys');
      }
      if (day.description.includes('Underground City') || day.description.includes('Kaymakli') || day.description.includes('Derinkuyu')) {
        highlights.push('Underground cities exploration');
      }
    });

    const destinations = extractDestinations(itinerary.days);

    // Build export data matching Funny Tourism format
    const exportData = {
      packageId: `Q${quoteId}`,
      packageType: 'WITH_HOTEL',
      title: itinerary.tourName,
      slug: slugify(itinerary.tourName),
      duration: itinerary.duration,
      description: `Experience an unforgettable journey through ${destinations}. This carefully crafted tour package offers the perfect blend of history, culture, and adventure, with professional guidance and comfortable accommodations throughout.`,
      destinations: destinations,
      image: '/images/hotelwithpackage.jpg',
      pdfUrl: null,
      highlights: highlights.length > 0 ? highlights : [
        'Professional English-speaking guide',
        'Comfortable accommodation',
        'Authentic Turkish experiences'
      ],
      included: itinerary.inclusions.split('\n').filter(line => line.trim() && line.trim() !== '-').map(line => line.replace(/^-\s*/, '').trim()),
      notIncluded: itinerary.exclusions.split('\n').filter(line => line.trim() && line.trim() !== '-').map(line => line.replace(/^-\s*/, '').trim()),
      itinerary: formattedItinerary,
      pricing: {
        paxTiers
      },
      hotels: Object.keys(hotels).length > 0 ? hotels : null,
      port: null,
      pickupType: null,
      // Additional metadata
      metadata: {
        quoteId: quote.id,
        quoteName: quote.quote_name,
        category: quote.category,
        seasonName: quote.season_name,
        validFrom: quote.valid_from,
        validTo: quote.valid_to,
        tourType: quote.tour_type,
        exportedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(exportData);

  } catch (error) {
    console.error('Error exporting itinerary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to export itinerary', details: message },
      { status: 500 }
    );
  }
}
