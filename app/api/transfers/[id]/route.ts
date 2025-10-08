import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';
import { resolveCityId } from '@/lib/cities';

// PUT - Update transfer
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
      console.error('Error resolving city for transfer update:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve city' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE transfers
       SET city_id = ?, transfer_type = ?, price = ?
       WHERE id = ? AND user_id = ?`,
      [
        resolvedCityId,
        data.transferType,
        data.price,
        id,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer updated successfully'
    });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    );
  }
}

// DELETE - Delete transfer
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
      `DELETE FROM transfers WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    return NextResponse.json(
      { error: 'Failed to delete transfer' },
      { status: 500 }
    );
  }
}
