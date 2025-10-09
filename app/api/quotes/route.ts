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
}

interface SaveQuoteRequest {
  quoteName: string;
  startDate: string;
  endDate: string;
  tourType: 'SIC' | 'Private';
  pax: number;
  markup: number;
  tax: number;
  transportPricingMode: 'total' | 'vehicle';
  days: DayExpenses[];
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
          `INSERT INTO quotes (user_id, quote_name, start_date, end_date, tour_type, pax, markup, tax, transport_pricing_mode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            data.quoteName,
            data.startDate,
            data.endDate,
            data.tourType,
            data.pax,
            data.markup,
            data.tax,
            data.transportPricingMode
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
                `INSERT INTO quote_expenses (quote_day_id, category, location, description, price, single_supplement, child_0to2, child_3to5, child_6to11, vehicle_count, price_per_vehicle)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  quoteDayId,
                  category,
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
      `SELECT id, quote_name, start_date, end_date, tour_type, pax, markup, tax,
              transport_pricing_mode, created_at, updated_at
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
