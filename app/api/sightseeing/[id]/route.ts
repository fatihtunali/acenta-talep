import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

// PUT - Update sightseeing fee
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
    const userId = parseInt(session.user.id, 10);
    const data = await request.json();

    let resolvedCityId: number;

    try {
      resolvedCityId = await resolveCityId(userId, {
        cityId: data.cityId ?? null,
        cityName: data.city ?? data.cityName ?? null
      });
    } catch (error) {
      console.error('Error resolving city for sightseeing update:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE sightseeing_fees
       SET city_id = ?, place_name = ?, price = ?
       WHERE id = ? AND user_id = ?`,
      [
        resolvedCityId,
        data.placeName,
        data.price,
        id,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Sightseeing fee not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Sightseeing fee updated successfully'
    });
  } catch (error) {
    console.error('Error updating sightseeing fee:', error);
    return NextResponse.json(
      { error: 'Failed to update sightseeing fee' },
      { status: 500 }
    );
  }
}

// DELETE - Delete sightseeing fee
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
      `DELETE FROM sightseeing_fees WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Sightseeing fee not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Sightseeing fee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sightseeing fee:', error);
    return NextResponse.json(
      { error: 'Failed to delete sightseeing fee' },
      { status: 500 }
    );
  }
}
