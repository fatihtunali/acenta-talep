import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Agency extends RowDataPacket {
  id: number;
  company_name: string;
}

// GET - Get single agency
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const agencyId = parseInt(resolvedParams.id);
    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    // Check if user has access to this agency
    if (userRole !== 'admin') {
      const [userAgency] = await pool.execute<RowDataPacket[]>(
        'SELECT agency_id FROM users WHERE id = ?',
        [userId]
      );

      if (!userAgency[0] || userAgency[0].agency_id !== agencyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const [agencies] = await pool.execute<Agency[]>(
      'SELECT * FROM agencies WHERE id = ?',
      [agencyId]
    );

    if (agencies.length === 0) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    return NextResponse.json({ agency: agencies[0] });
  } catch (error) {
    console.error('Error fetching agency:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agency' },
      { status: 500 }
    );
  }
}

// PUT - Update agency
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const agencyId = parseInt(resolvedParams.id);
    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    // Check if user has access to this agency
    if (userRole !== 'admin') {
      const [userAgency] = await pool.execute<RowDataPacket[]>(
        'SELECT agency_id, user_role FROM users WHERE id = ?',
        [userId]
      );

      if (!userAgency[0] || userAgency[0].agency_id !== agencyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Only agency_owner can update (or admin)
      if (userAgency[0].user_role !== 'agency_owner' && userAgency[0].user_role !== 'admin') {
        return NextResponse.json(
          { error: 'Only agency owners can update settings' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const {
      company_name,
      contact_person,
      email,
      phone,
      website,
      address,
      city,
      country,
      logo_url,
      primary_color,
      secondary_color,
      default_markup_percentage,
      currency,
      status,
      subscription_type,
      subscription_expires_at
    } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (company_name !== undefined) {
      updates.push('company_name = ?', 'company_name_normalized = ?');
      values.push(company_name, company_name.trim().toLowerCase());
    }
    if (contact_person !== undefined) {
      updates.push('contact_person = ?');
      values.push(contact_person);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (website !== undefined) {
      updates.push('website = ?');
      values.push(website);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (logo_url !== undefined) {
      updates.push('logo_url = ?');
      values.push(logo_url);
    }
    if (primary_color !== undefined) {
      updates.push('primary_color = ?');
      values.push(primary_color);
    }
    if (secondary_color !== undefined) {
      updates.push('secondary_color = ?');
      values.push(secondary_color);
    }
    if (default_markup_percentage !== undefined) {
      updates.push('default_markup_percentage = ?');
      values.push(default_markup_percentage);
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      values.push(currency);
    }
    if (status !== undefined && userRole === 'admin') {
      // Only admin can change status
      updates.push('status = ?');
      values.push(status);
    }
    if (subscription_type !== undefined && userRole === 'admin') {
      // Only admin can change subscription
      updates.push('subscription_type = ?');
      values.push(subscription_type);
    }
    if (subscription_expires_at !== undefined && userRole === 'admin') {
      updates.push('subscription_expires_at = ?');
      values.push(subscription_expires_at);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(agencyId);

    await pool.execute<ResultSetHeader>(
      `UPDATE agencies SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated agency
    const [agencies] = await pool.execute<Agency[]>(
      'SELECT * FROM agencies WHERE id = ?',
      [agencyId]
    );

    return NextResponse.json({ agency: agencies[0] });
  } catch (error) {
    console.error('Error updating agency:', error);
    return NextResponse.json(
      { error: 'Failed to update agency' },
      { status: 500 }
    );
  }
}

// DELETE - Delete agency (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const agencyId = parseInt(resolvedParams.id);

    // Check if agency has users
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE agency_id = ?',
      [agencyId]
    );

    if (users[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete agency with active users' },
        { status: 400 }
      );
    }

    await pool.execute<ResultSetHeader>('DELETE FROM agencies WHERE id = ?', [
      agencyId
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agency:', error);
    return NextResponse.json(
      { error: 'Failed to delete agency' },
      { status: 500 }
    );
  }
}
