import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - List all restaurants with their menu pricing
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    let query = `
      SELECT
        r.id as restaurant_id,
        r.city,
        r.restaurant_name,
        r.created_at as restaurant_created_at,
        rmp.id as menu_id,
        rmp.menu_option,
        rmp.price,
        rmp.start_date,
        rmp.end_date,
        rmp.created_at as menu_created_at
      FROM restaurants r
      LEFT JOIN restaurant_menu_pricing rmp ON r.id = rmp.restaurant_id
      WHERE r.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (city) {
      query += ` AND r.city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY r.city, r.restaurant_name, rmp.menu_option`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Group menu items by restaurant
    const restaurantsMap = new Map();

    rows.forEach((row) => {
      const restaurantId = row.restaurant_id;

      if (!restaurantsMap.has(restaurantId)) {
        restaurantsMap.set(restaurantId, {
          id: restaurantId,
          city: row.city,
          restaurant_name: row.restaurant_name,
          created_at: row.restaurant_created_at,
          menu: []
        });
      }

      // Add menu item if it exists
      if (row.menu_id) {
        restaurantsMap.get(restaurantId).menu.push({
          id: row.menu_id,
          menu_option: row.menu_option,
          price: parseFloat(row.price),
          start_date: row.start_date,
          end_date: row.end_date,
          created_at: row.menu_created_at
        });
      }
    });

    const restaurants = Array.from(restaurantsMap.values());

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

// POST - Create new restaurant (without menu items initially)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO restaurants (user_id, city, restaurant_name)
       VALUES (?, ?, ?)`,
      [userId, data.city, data.restaurantName]
    );

    return NextResponse.json({
      success: true,
      restaurantId: result.insertId,
      message: 'Restaurant created successfully'
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return NextResponse.json(
      { error: 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}
