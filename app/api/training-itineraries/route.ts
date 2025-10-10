import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface TrainingItinerary {
  id: number;
  title: string;
  tour_type: 'Private' | 'SIC';
  days: number;
  cities: string;
  content: string;
  created_at: string;
}

// GET - List all training itineraries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS training_itineraries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        tour_type ENUM('Private', 'SIC') NOT NULL,
        days INT NOT NULL,
        cities TEXT,
        content LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tour_type (tour_type),
        INDEX idx_days (days)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM training_itineraries ORDER BY created_at DESC'
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error loading training itineraries:', error);
    return NextResponse.json(
      { error: 'Failed to load training itineraries' },
      { status: 500 }
    );
  }
}

// POST - Create new training itinerary
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, tour_type, days, cities, content } = body;

    if (!title || !tour_type || !days || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO training_itineraries (title, tour_type, days, cities, content)
       VALUES (?, ?, ?, ?, ?)`,
      [title, tour_type, days, cities || '', content]
    );

    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: 'Training itinerary added successfully'
    });
  } catch (error) {
    console.error('Error creating training itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to create training itinerary' },
      { status: 500 }
    );
  }
}
