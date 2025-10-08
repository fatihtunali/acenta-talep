import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

// PUT - Update SIC tour base information (city, tour_name)
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
      console.error('Error resolving city for SIC tour update:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE sic_tours
       SET city_id = ?, tour_name = ?
       WHERE id = ? AND user_id = ?`,
      [
        resolvedCityId,
        data.tourName,
        id,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'SIC tour not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'SIC tour updated successfully'
    });
  } catch (error) {
    console.error('Error updating SIC tour:', error);
    return NextResponse.json(
      { error: 'Failed to update SIC tour' },
      { status: 500 }
    );
  }
}

// DELETE - Delete SIC tour (will cascade delete all pricing periods)
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
      `DELETE FROM sic_tours WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'SIC tour not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'SIC tour and all its pricing periods deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting SIC tour:', error);
    return NextResponse.json(
      { error: 'Failed to delete SIC tour' },
      { status: 500 }
    );
  }
}
