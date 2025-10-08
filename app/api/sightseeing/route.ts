import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

// GET - List all sightseeing fees for the current user, optionally filtered by city
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
        sf.id,
        sf.city_id,
        c.name AS city_name,
        sf.place_name,
        sf.price,
        sf.created_at,
        sf.updated_at
      FROM sightseeing_fees sf
      JOIN cities c ON c.id = sf.city_id
      WHERE sf.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (cityId) {
      query += ` AND sf.city_id = ?`;
      params.push(parseInt(cityId, 10));
    } else if (city) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY c.name, sf.place_name`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const sightseeing = rows.map(item => ({
      id: item.id,
      cityId: item.city_id,
      city: item.city_name,
      place_name: item.place_name,
      price: parseFloat(item.price),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    return NextResponse.json({ sightseeing });
  } catch (error) {
    console.error('Error fetching sightseeing fees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sightseeing fees' },
      { status: 500 }
    );
  }
}

// POST - Create new sightseeing fee
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
      console.error('Error resolving city for sightseeing:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sightseeing_fees (user_id, city_id, place_name, price)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        resolvedCityId,
        data.placeName,
        data.price
      ]
    );

    return NextResponse.json({
      success: true,
      sightseeingId: result.insertId,
      message: 'Sightseeing fee added successfully'
    });
  } catch (error) {
    console.error('Error creating sightseeing fee:', error);
    return NextResponse.json(
      { error: 'Failed to create sightseeing fee' },
      { status: 500 }
    );
  }
}
