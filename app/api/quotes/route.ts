import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface DayExpenses {
  dayNumber: number;
  date: string;
  hotelAccommodation: ExpenseItem[];
  meals: ExpenseItem[];
  entranceFees: ExpenseItem[];
  sicTourCost: ExpenseItem[];
  tips: ExpenseItem[];
  transportation: ExpenseItem[];
  guide: ExpenseItem[];
  guideDriverAccommodation: ExpenseItem[];
  parking: ExpenseItem[];
}

interface ExpenseItem {
  id: string;
  location: string;
  description: string;
  price: number;
  singleSupplement?: number;
  child0to2?: number;
  child3to5?: number;
  child6to11?: number;
  vehicleCount?: number;
  pricePerVehicle?: number;
  hotelCategory?: string;
}

interface SaveQuoteRequest {
  quoteName: string;
  category: 'Fixed Departures' | 'Groups' | 'B2B' | 'B2C';
  seasonName?: string;
  validFrom?: string;
  validTo?: string;
  startDate: string;
  endDate: string;
  tourType: 'SIC' | 'Private';
  pax: number;
  markup: number;
  agencyMarkup?: number;
  tax: number;
  transportPricingMode: 'total' | 'vehicle';
  days: DayExpenses[];
}

type HotelCategoryLabel = '3 stars' | '4 stars' | '5 stars';

interface PricingCategoryTotals {
  adultPerPerson: number;
  singleSupplement: number;
  child0to2: number | 'FOC';
  child3to5: number | 'FOC';
  child6to11: number | 'FOC';
}

interface PricingTableRow {
  pax: number;
  categories: Record<HotelCategoryLabel, PricingCategoryTotals>;
}

// POST - Save new quote
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/quotes - Starting');
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.log('[API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API] User:', session.user.id, session.user.email);

    const data: SaveQuoteRequest = await request.json();
    console.log('[API] Request data received:', {
      quoteName: data.quoteName,
      tourType: data.tourType,
      pax: data.pax,
      daysCount: data.days?.length
    });

    const connection = await pool.getConnection();
    console.log('[API] Database connection obtained');

    try {
      await connection.beginTransaction();
      console.log('[API] Transaction started');

      // Convert user ID to number for database
      const userId = parseInt(session.user.id, 10);
      console.log('[API] User ID converted to:', userId, 'from', session.user.id);

      // Calculate pricing table using same logic as pricing page
      const calculateDayTotals = (day: DayExpenses, hotelCategory?: string) => {
        const hotels = hotelCategory
          ? day.hotelAccommodation.filter(e => e.hotelCategory === hotelCategory)
          : day.hotelAccommodation;

        const perPersonTotal =
          hotels.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.meals.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.entranceFees.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.sicTourCost.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.tips.reduce((sum, e) => sum + (e.price || 0), 0);

        const singleSupplementTotal =
          hotels.reduce((sum, e) => sum + (e.singleSupplement || 0), 0) +
          day.meals.reduce((sum, e) => sum + (e.singleSupplement || 0), 0) +
          day.entranceFees.reduce((sum, e) => sum + (e.singleSupplement || 0), 0);

        const child0to2Total =
          hotels.reduce((sum, e) => sum + (e.child0to2 || 0), 0) +
          day.meals.reduce((sum, e) => sum + (e.child0to2 || 0), 0) +
          day.entranceFees.reduce((sum, e) => sum + (e.child0to2 || 0), 0) +
          day.sicTourCost.reduce((sum, e) => sum + (e.child0to2 || 0), 0);

        const child3to5Total =
          hotels.reduce((sum, e) => sum + (e.child3to5 || 0), 0) +
          day.meals.reduce((sum, e) => sum + (e.child3to5 || 0), 0) +
          day.entranceFees.reduce((sum, e) => sum + (e.child3to5 || 0), 0) +
          day.sicTourCost.reduce((sum, e) => sum + (e.child3to5 || 0), 0);

        const child6to11Total =
          hotels.reduce((sum, e) => sum + (e.child6to11 || 0), 0) +
          day.meals.reduce((sum, e) => sum + (e.child6to11 || 0), 0) +
          day.entranceFees.reduce((sum, e) => sum + (e.child6to11 || 0), 0) +
          day.sicTourCost.reduce((sum, e) => sum + (e.child6to11 || 0), 0);

        const generalTotal =
          day.transportation.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.guide.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.guideDriverAccommodation.reduce((sum, e) => sum + (e.price || 0), 0) +
          day.parking.reduce((sum, e) => sum + (e.price || 0), 0);

        return { perPersonTotal, singleSupplementTotal, child0to2Total, child3to5Total, child6to11Total, generalTotal };
      };

      const selectedHotelCategories: HotelCategoryLabel[] = ['3 stars', '4 stars', '5 stars'];
      const paxSlabs = [2, 4, 6, 8, 10];
      const markup = data.markup;
      const tax = data.tax;

      const pricingTable: PricingTableRow[] = paxSlabs.map(currentPax => {
        const categoriesData: Partial<Record<HotelCategoryLabel, PricingCategoryTotals>> = {};

        selectedHotelCategories.forEach(category => {
          let totalPerPerson = 0;
          let totalSingleSupplement = 0;
          let totalChild0to2 = 0;
          let totalChild3to5 = 0;
          let totalChild6to11 = 0;
          let totalGeneral = 0;

          data.days.forEach(day => {
            const dayTotals = calculateDayTotals(day, category);
            totalPerPerson += dayTotals.perPersonTotal;
            totalSingleSupplement += dayTotals.singleSupplementTotal;
            totalChild0to2 += dayTotals.child0to2Total;
            totalChild3to5 += dayTotals.child3to5Total;
            totalChild6to11 += dayTotals.child6to11Total;
            totalGeneral += dayTotals.generalTotal;
          });

          const generalPerPerson = currentPax > 0 ? totalGeneral / currentPax : 0;
          const adultCost = totalPerPerson + generalPerPerson;
          const adultSubtotal = adultCost * currentPax;
          const adultWithMarkup = adultSubtotal * (1 + markup / 100);
          const adultFinal = adultWithMarkup * (1 + tax / 100);
          const adultPerPerson = adultFinal / currentPax;

          const sglWithMarkup = totalSingleSupplement * (1 + markup / 100);
          const sglFinal = sglWithMarkup * (1 + tax / 100);

          const child0to2IsFOC = totalChild0to2 === 0;
          const child0to2WithMarkup = totalChild0to2 * (1 + markup / 100);
          const child0to2Final = child0to2WithMarkup * (1 + tax / 100);

          const child3to5IsFOC = totalChild3to5 === 0;
          const child3to5WithMarkup = totalChild3to5 * (1 + markup / 100);
          const child3to5Final = child3to5WithMarkup * (1 + tax / 100);

          const child6to11IsFOC = totalChild6to11 === 0;
          const child6to11WithMarkup = totalChild6to11 * (1 + markup / 100);
          const child6to11Final = child6to11WithMarkup * (1 + tax / 100);

          categoriesData[category] = {
            adultPerPerson: Math.round(adultPerPerson),
            singleSupplement: Math.round(sglFinal),
            child0to2: child0to2IsFOC ? 'FOC' : Math.round(child0to2Final),
            child3to5: child3to5IsFOC ? 'FOC' : Math.round(child3to5Final),
            child6to11: child6to11IsFOC ? 'FOC' : Math.round(child6to11Final)
          };
        });

        return {
          pax: currentPax,
          categories: categoriesData as Record<HotelCategoryLabel, PricingCategoryTotals>
        };
      });

      // Insert main quote
      console.log('[API] Inserting quote with values:', {
        userId,
        quoteName: data.quoteName,
        startDate: data.startDate,
        endDate: data.endDate,
        tourType: data.tourType,
        pax: data.pax,
        markup: data.markup,
        tax: data.tax,
        transportPricingMode: data.transportPricingMode
      });

      let quoteResult;
      try {
        [quoteResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO quotes (user_id, quote_name, category, season_name, valid_from, valid_to, start_date, end_date, tour_type, pax, markup, markup_percentage, tax, transport_pricing_mode, pricing_table)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            data.quoteName,
            data.category || 'B2C',
            data.seasonName || null,
            data.validFrom || null,
            data.validTo || null,
            data.startDate,
            data.endDate,
            data.tourType,
            data.pax,
            data.markup,
            data.agencyMarkup || 0,
            data.tax,
            data.transportPricingMode,
            JSON.stringify(pricingTable)
          ]
        );
        console.log('[API] Quote inserted successfully, ID:', quoteResult.insertId);
      } catch (insertError) {
        console.error('[API] INSERT ERROR:', insertError);
        if (insertError instanceof Error) {
          console.error('[API] SQL Error details:', {
            message: insertError.message,
            code: (insertError as Error & { code?: string }).code,
            sqlState: (insertError as Error & { sqlState?: string }).sqlState,
            sqlMessage: (insertError as Error & { sqlMessage?: string }).sqlMessage
          });
        }
        throw insertError;
      }

      const quoteId = quoteResult.insertId;

      // Insert days and expenses
      for (const day of data.days) {
        // Extract just the date part (YYYY-MM-DD) from ISO string
        const dateOnly = day.date.split('T')[0];
        const [dayResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO quote_days (quote_id, day_number, date) VALUES (?, ?, ?)`,
          [quoteId, day.dayNumber, dateOnly]
        );

        const quoteDayId = dayResult.insertId;

        // Insert all expenses for this day
        const expenseCategories: (keyof DayExpenses)[] = [
          'hotelAccommodation', 'meals', 'entranceFees', 'sicTourCost', 'tips',
          'transportation', 'guide', 'guideDriverAccommodation', 'parking'
        ];

        for (const category of expenseCategories) {
          const expenses = day[category] as ExpenseItem[];
          for (const expense of expenses) {
            // Only save expenses with actual data
            if (expense.location || expense.description || expense.price > 0) {
              await connection.execute(
                `INSERT INTO quote_expenses (quote_day_id, category, hotel_category, location, description, price, single_supplement, child_0to2, child_3to5, child_6to11, vehicle_count, price_per_vehicle)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  quoteDayId,
                  category,
                  expense.hotelCategory || null,
                  expense.location,
                  expense.description,
                  expense.price,
                  expense.singleSupplement || null,
                  expense.child0to2 || null,
                  expense.child3to5 || null,
                  expense.child6to11 || null,
                  expense.vehicleCount || null,
                  expense.pricePerVehicle || null
                ]
              );
            }
          }
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        quoteId,
        message: 'Quote saved successfully'
      });
    } catch (error) {
      console.error('[API] Transaction error:', error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[API] Error saving quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to save quote', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET - List all quotes for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    const [quotes] = await pool.execute<RowDataPacket[]>(
      `SELECT id, quote_name, quote_status, category, season_name, valid_from, valid_to, start_date, end_date, tour_type, pax,
              markup, markup_percentage, tax, transport_pricing_mode, created_at, updated_at
       FROM quotes
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
