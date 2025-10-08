import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - List all hotels for the current user, optionally filtered by city
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    let query = `SELECT * FROM hotels WHERE user_id = ?`;
    const params: (number | string)[] = [userId];

    if (city) {
      query += ` AND city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY city, hotel_name`;

    const [hotelRows] = await pool.execute<RowDataPacket[]>(query, params);

    // Convert decimal values to numbers
    const hotels = hotelRows.map(hotel => ({
      id: hotel.id,
      city: hotel.city,
      hotel_name: hotel.hotel_name,
      category: hotel.category,
      pp_dbl_rate: parseFloat(hotel.pp_dbl_rate),
      single_supplement: hotel.single_supplement ? parseFloat(hotel.single_supplement) : null,
      child_0to2: hotel.child_0to2 ? parseFloat(hotel.child_0to2) : null,
      child_3to5: hotel.child_3to5 ? parseFloat(hotel.child_3to5) : null,
      child_6to11: hotel.child_6to11 ? parseFloat(hotel.child_6to11) : null,
      created_at: hotel.created_at,
      updated_at: hotel.updated_at
    }));

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}

// POST - Create new hotel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO hotels (user_id, city, hotel_name, category, pp_dbl_rate, single_supplement, child_0to2, child_3to5, child_6to11)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.city,
        data.hotelName,
        data.category,
        data.ppDblRate,
        data.singleSupplement || null,
        data.child0to2 || null,
        data.child3to5 || null,
        data.child6to11 || null
      ]
    );

    return NextResponse.json({
      success: true,
      hotelId: result.insertId,
      message: 'Hotel added successfully'
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return NextResponse.json(
      { error: 'Failed to create hotel' },
      { status: 500 }
    );
  }
}
