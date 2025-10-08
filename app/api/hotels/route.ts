import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

// GET - List all hotels with their pricing periods
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
        h.id as hotel_id,
        h.city_id,
        c.name AS city_name,
        h.hotel_name,
        h.category,
        h.created_at as hotel_created_at,
        hp.id as pricing_id,
        hp.start_date,
        hp.end_date,
        hp.pp_dbl_rate,
        hp.single_supplement,
        hp.child_0to2,
        hp.child_3to5,
        hp.child_6to11,
        hp.created_at as pricing_created_at
      FROM hotels h
      JOIN cities c ON c.id = h.city_id
      LEFT JOIN hotel_pricing hp ON h.id = hp.hotel_id
      WHERE h.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (cityId) {
      query += ` AND h.city_id = ?`;
      params.push(parseInt(cityId, 10));
    } else if (city) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY c.name, h.hotel_name, hp.start_date`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Group pricing periods by hotel
    const hotelsMap = new Map();

    rows.forEach((row) => {
      const hotelId = row.hotel_id;

      if (!hotelsMap.has(hotelId)) {
        hotelsMap.set(hotelId, {
          id: hotelId,
          cityId: row.city_id,
          city: row.city_name,
          hotel_name: row.hotel_name,
          category: row.category,
          created_at: row.hotel_created_at,
          pricing: []
        });
      }

      // Add pricing period if it exists
      if (row.pricing_id) {
        hotelsMap.get(hotelId).pricing.push({
          id: row.pricing_id,
          start_date: row.start_date,
          end_date: row.end_date,
          pp_dbl_rate: parseFloat(row.pp_dbl_rate),
          single_supplement: row.single_supplement ? parseFloat(row.single_supplement) : null,
          child_0to2: row.child_0to2 ? parseFloat(row.child_0to2) : null,
          child_3to5: row.child_3to5 ? parseFloat(row.child_3to5) : null,
          child_6to11: row.child_6to11 ? parseFloat(row.child_6to11) : null,
          created_at: row.pricing_created_at
        });
      }
    });

    const hotels = Array.from(hotelsMap.values());

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}

// POST - Create new hotel (without pricing initially)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    try {
      const resolvedCityId = await resolveCityId(userId, {
        cityId: data.cityId ?? null,
        cityName: data.city ?? data.cityName ?? null
      });

      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO hotels (user_id, city_id, hotel_name, category)
         VALUES (?, ?, ?, ?)`,
        [userId, resolvedCityId, data.hotelName, data.category]
      );

      return NextResponse.json({
        success: true,
        hotelId: result.insertId,
        message: 'Hotel created successfully'
      });
    } catch (error) {
      console.error('Error resolving city for hotel:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error creating hotel:', error);
    return NextResponse.json(
      { error: 'Failed to create hotel' },
      { status: 500 }
    );
  }
}
