import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

    let query = `SELECT * FROM sightseeing_fees WHERE user_id = ?`;
    const params: (number | string)[] = [userId];

    if (city) {
      query += ` AND city LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY city, place_name`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Convert decimal values to numbers
    const sightseeing = rows.map(item => ({
      id: item.id,
      city: item.city,
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

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO sightseeing_fees (user_id, city, place_name, price)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        data.city,
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
