import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

// GET - List all transfers for the current user, optionally filtered by city
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
        t.id,
        t.city_id,
        c.name AS city_name,
        t.transfer_type,
        t.price,
        t.created_at,
        t.updated_at
      FROM transfers t
      JOIN cities c ON c.id = t.city_id
      WHERE t.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (cityId) {
      query += ` AND t.city_id = ?`;
      params.push(parseInt(cityId, 10));
    } else if (city) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${city}%`);
    }

    query += ` ORDER BY c.name, t.transfer_type`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const transfers = rows.map(item => ({
      id: item.id,
      cityId: item.city_id,
      city: item.city_name,
      transfer_type: item.transfer_type,
      price: parseFloat(item.price),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    return NextResponse.json({ transfers });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

// POST - Create new transfer
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
      console.error('Error resolving city for transfer:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO transfers (user_id, city_id, transfer_type, price)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        resolvedCityId,
        data.transferType,
        data.price
      ]
    );

    return NextResponse.json({
      success: true,
      transferId: result.insertId,
      message: 'Transfer added successfully'
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
