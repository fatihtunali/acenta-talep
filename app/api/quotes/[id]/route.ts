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
          pricePerVehicle: expense.price_per_vehicle ? parseFloat(expense.price_per_vehicle) : undefined
        };

        const category = expense.category as keyof DayExpenses;
        if (Array.isArray(dayExpenses[category])) {
          (dayExpenses[category] as ExpenseItem[]).push(expenseItem);
        }
      }

      days.push(dayExpenses);
    }

    return NextResponse.json({
      id: quote.id,
      quoteName: quote.quote_name,
      startDate: quote.start_date,
      endDate: quote.end_date,
      tourType: quote.tour_type,
      pax: quote.pax,
      markup: parseFloat(quote.markup),
      tax: parseFloat(quote.tax),
      transportPricingMode: quote.transport_pricing_mode,
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

      // Update quote
      await connection.execute(
        `UPDATE quotes
         SET quote_name = ?, start_date = ?, end_date = ?, tour_type = ?,
             pax = ?, markup = ?, tax = ?, transport_pricing_mode = ?
         WHERE id = ?`,
        [
          data.quoteName,
          data.startDate,
          data.endDate,
          data.tourType,
          data.pax,
          data.markup,
          data.tax,
          data.transportPricingMode,
          id
        ]
      );

      // Delete existing days and expenses (cascade will handle expenses)
      await connection.execute(`DELETE FROM quote_days WHERE quote_id = ?`, [id]);

      // Insert new days and expenses
      for (const day of data.days) {
        const [dayResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO quote_days (quote_id, day_number, date) VALUES (?, ?, ?)`,
          [id, day.dayNumber, day.date]
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
