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

// GET - Load specific quote
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
    const userId = parseInt(session.user.id, 10);

    // Get quote details
    const [quoteRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM quotes WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (quoteRows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = quoteRows[0];

    // Get all days for this quote
    const [dayRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM quote_days WHERE quote_id = ? ORDER BY day_number`,
      [id]
    );

    // Get all expenses for each day
    const days: DayExpenses[] = [];

    for (const day of dayRows) {
      const [expenseRows] = await pool.execute<RowDataPacket[]>(
        `SELECT * FROM quote_expenses WHERE quote_day_id = ?`,
        [day.id]
      );

      const dayExpenses: DayExpenses = {
        dayNumber: day.day_number,
        date: day.date,
        hotelAccommodation: [],
        meals: [],
        entranceFees: [],
        sicTourCost: [],
        tips: [],
        transportation: [],
        guide: [],
        guideDriverAccommodation: [],
        parking: []
      };

      // Group expenses by category
      for (const expense of expenseRows) {
        const expenseItem: ExpenseItem = {
          id: expense.id.toString(),
          location: expense.location || '',
          description: expense.description || '',
          price: parseFloat(expense.price),
          singleSupplement: expense.single_supplement ? parseFloat(expense.single_supplement) : undefined,
          child0to2: expense.child_0to2 ? parseFloat(expense.child_0to2) : undefined,
          child3to5: expense.child_3to5 ? parseFloat(expense.child_3to5) : undefined,
          child6to11: expense.child_6to11 ? parseFloat(expense.child_6to11) : undefined,
          vehicleCount: expense.vehicle_count,
          pricePerVehicle: expense.price_per_vehicle ? parseFloat(expense.price_per_vehicle) : undefined,
          hotelCategory: expense.hotel_category || undefined
        };

        const category = expense.category as keyof DayExpenses;
        if (Array.isArray(dayExpenses[category])) {
          (dayExpenses[category] as ExpenseItem[]).push(expenseItem);
        }
      }

      days.push(dayExpenses);
    }

    // Parse pricing_table if it exists
    let pricingTable = null;
    if (quote.pricing_table) {
      try {
        pricingTable = typeof quote.pricing_table === 'string'
          ? JSON.parse(quote.pricing_table)
          : quote.pricing_table;
      } catch (e) {
        console.error('Error parsing pricing_table:', e);
      }
    }

    // Parse itinerary_data if it exists
    let itineraryData = null;
    if (quote.itinerary_data) {
      try {
        itineraryData = typeof quote.itinerary_data === 'string'
          ? JSON.parse(quote.itinerary_data)
          : quote.itinerary_data;
      } catch (e) {
        console.error('Error parsing itinerary_data:', e);
      }
    }

    return NextResponse.json({
      id: quote.id,
      quoteName: quote.quote_name,
      category: quote.category,
      startDate: quote.start_date,
      endDate: quote.end_date,
      tourType: quote.tour_type,
      pax: quote.pax,
      markup: parseFloat(quote.markup),
      tax: parseFloat(quote.tax),
      transportPricingMode: quote.transport_pricing_mode,
      pricingTable,
      itineraryData,
      days,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at
    });
  } catch (error) {
    console.error('Error loading quote:', error);
    return NextResponse.json(
      { error: 'Failed to load quote' },
      { status: 500 }
    );
  }
}

// PUT - Update existing quote
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    const userId = parseInt(session.user.id, 10);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify ownership
      const [quoteRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM quotes WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      if (quoteRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

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

          data.days.forEach((day: DayExpenses) => {
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

      // Update quote
      await connection.execute(
        `UPDATE quotes
         SET quote_name = ?, category = ?, start_date = ?, end_date = ?, tour_type = ?,
             pax = ?, markup = ?, tax = ?, transport_pricing_mode = ?, pricing_table = ?
         WHERE id = ?`,
        [
          data.quoteName,
          data.category || 'B2C',
          data.startDate,
          data.endDate,
          data.tourType,
          data.pax,
          data.markup,
          data.tax,
          data.transportPricingMode,
          JSON.stringify(pricingTable),
          id
        ]
      );

      // Delete existing days and expenses (cascade will handle expenses)
      await connection.execute(`DELETE FROM quote_days WHERE quote_id = ?`, [id]);

      // Insert new days and expenses
      for (const day of data.days) {
        // Extract just the date part (YYYY-MM-DD) from ISO string
        const dateOnly = day.date.split('T')[0];
        const [dayResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO quote_days (quote_id, day_number, date) VALUES (?, ?, ?)`,
          [id, day.dayNumber, dateOnly]
        );

        const quoteDayId = dayResult.insertId;

        const expenseCategories: (keyof DayExpenses)[] = [
          'hotelAccommodation', 'meals', 'entranceFees', 'sicTourCost', 'tips',
          'transportation', 'guide', 'guideDriverAccommodation', 'parking'
        ];

        for (const category of expenseCategories) {
          const expenses = day[category] as ExpenseItem[];
          for (const expense of expenses) {
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
        message: 'Quote updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

// DELETE - Delete quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id, 10);

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM quotes WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}
