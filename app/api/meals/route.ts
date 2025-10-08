import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - List all meals for the current user, optionally filtered by city
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    let query = `SELECT * FROM meals WHERE user_id = ?`;
    const params: (number | string)[] = [userId];

    if (city) {
      query += ` AND city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY city, restaurant_name, menu_option`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Convert decimal values to numbers
    const meals = rows.map(item => ({
      id: item.id,
      city: item.city,
      restaurant_name: item.restaurant_name,
      menu_option: item.menu_option,
      price: parseFloat(item.price),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    return NextResponse.json({ meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    );
  }
}

// POST - Create new meal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO meals (user_id, city, restaurant_name, menu_option, price)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        data.city,
        data.restaurantName,
        data.menuOption,
        data.price
      ]
    );

    return NextResponse.json({
      success: true,
      mealId: result.insertId,
      message: 'Meal added successfully'
    });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    );
  }
}
