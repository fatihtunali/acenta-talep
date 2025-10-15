import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Agency extends RowDataPacket {
  id: number;
  company_name: string;
  company_name_normalized: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  default_markup_percentage: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription_type: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// GET - List all agencies (admin only) or get current user's agency
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: number }).id;
    const userRole = (session.user as { role?: string }).role;

    // Admin can see all agencies
    if (userRole === 'admin') {
      const [agencies] = await pool.execute<Agency[]>(
        `SELECT * FROM agencies ORDER BY company_name ASC`
      );

      return NextResponse.json({ agencies });
    }

    // Regular users see only their agency
    const [agencies] = await pool.execute<Agency[]>(
      `SELECT a.* FROM agencies a
       INNER JOIN users u ON u.agency_id = a.id
       WHERE u.id = ?`,
      [userId]
    );

    return NextResponse.json({ agency: agencies[0] || null });
  } catch (error) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agencies' },
      { status: 500 }
    );
  }
}

// POST - Create new agency (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;

    // Only admin can create agencies
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      country = 'Turkey',
      logo_url,
      primary_color = '#1e40af',
      secondary_color = '#3b82f6',
      default_markup_percentage = 15.00,
      currency = 'USD',
      status = 'active',
      subscription_type = 'basic',
      subscription_expires_at
    } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Normalize company name for uniqueness check
    const company_name_normalized = company_name.trim().toLowerCase();

    // Check if agency already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM agencies WHERE company_name_normalized = ?',
      [company_name_normalized]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Agency with this name already exists' },
        { status: 409 }
      );
    }

    // Insert new agency
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO agencies (
        company_name, company_name_normalized, contact_person, email, phone,
        website, address, city, country, logo_url, primary_color, secondary_color,
        default_markup_percentage, currency, status, subscription_type, subscription_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name,
        company_name_normalized,
        contact_person || null,
        email || null,
        phone || null,
        website || null,
        address || null,
        city || null,
        country,
        logo_url || null,
        primary_color,
        secondary_color,
        default_markup_percentage,
        currency,
        status,
        subscription_type,
        subscription_expires_at || null
      ]
    );

    // Fetch the created agency
    const [agencies] = await pool.execute<Agency[]>(
      'SELECT * FROM agencies WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({ agency: agencies[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating agency:', error);
    return NextResponse.json(
      { error: 'Failed to create agency' },
      { status: 500 }
    );
  }
}
