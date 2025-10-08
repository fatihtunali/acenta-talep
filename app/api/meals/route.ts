import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

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
    const cityId = searchParams.get('cityId');

    let query = `
      SELECT
        r.id as restaurant_id,
        r.city_id,
        c.name AS city_name,
        r.restaurant_name,
        r.created_at as restaurant_created_at,
        rmp.id as menu_id,
        rmp.menu_option,
        rmp.price,
        rmp.start_date,
        rmp.end_date,
        rmp.created_at as menu_created_at
      FROM restaurants r
      JOIN cities c ON c.id = r.city_id
      LEFT JOIN restaurant_menu_pricing rmp ON r.id = rmp.restaurant_id
      WHERE r.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (cityId) {
      query += ` AND r.city_id = ?`;
      params.push(parseInt(cityId, 10));
    } else if (city) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY c.name, r.restaurant_name, rmp.menu_option`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Group menu items by restaurant
    const restaurantsMap = new Map();

    rows.forEach((row) => {
      const restaurantId = row.restaurant_id;

      if (!restaurantsMap.has(restaurantId)) {
        restaurantsMap.set(restaurantId, {
          id: restaurantId,
          cityId: row.city_id,
          city: row.city_name,
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

    let resolvedCityId: number;

    try {
      resolvedCityId = await resolveCityId(userId, {
        cityId: data.cityId ?? null,
        cityName: data.city ?? data.cityName ?? null
      });
    } catch (error) {
      console.error('Error resolving city for restaurant:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO restaurants (user_id, city_id, restaurant_name)
       VALUES (?, ?, ?)`,
      [userId, resolvedCityId, data.restaurantName]
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
