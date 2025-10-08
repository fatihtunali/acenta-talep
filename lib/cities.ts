import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CityRecord {
  id: number;
  name: string;
  normalized_name: string;
}

export const normalizeCityName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const sanitizeCityDisplayName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ');

export async function getCitiesForUser(userId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, normalized_name
     FROM cities
     WHERE user_id = ?
     ORDER BY name`,
    [userId]
  );

  return rows as CityRecord[];
}

export async function getCityById(userId: number, cityId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, normalized_name
     FROM cities
     WHERE id = ? AND user_id = ?`,
    [cityId, userId]
  );

  return (rows[0] as CityRecord | undefined) ?? null;
}

export async function ensureCity(userId: number, rawName: string) {
  const cleanedName = sanitizeCityDisplayName(rawName);

  if (!cleanedName) {
    throw new Error('City name is required');
  }

  const normalized = normalizeCityName(cleanedName);

  const [existingRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, normalized_name
     FROM cities
     WHERE user_id = ? AND normalized_name = ?`,
    [userId, normalized]
  );

  const existing = existingRows[0] as CityRecord | undefined;

  if (existing) {
    if (existing.name !== cleanedName) {
      await pool.execute(
        `UPDATE cities
         SET name = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cleanedName, existing.id]
      );
    }

    return { id: existing.id, name: cleanedName, normalized };
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO cities (user_id, name, normalized_name)
     VALUES (?, ?, ?)`,
    [userId, cleanedName, normalized]
  );

  return { id: result.insertId, name: cleanedName, normalized };
}

export async function resolveCityId(
  userId: number,
  options: { cityId?: number | null; cityName?: string | null }
) {
  const { cityId, cityName } = options;

  if (cityId) {
    const city = await getCityById(userId, cityId);
    if (!city) {
      throw new Error('Selected city not found for this user');
    }

    if (cityName) {
      const normalized = normalizeCityName(cityName);
      if (normalized !== city.normalized_name) {
        const cleanedName = sanitizeCityDisplayName(cityName);
        await pool.execute(
          `UPDATE cities
           SET name = ?, normalized_name = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [cleanedName, normalized, city.id]
        );
        return city.id;
      }
    }

    return city.id;
  }

  if (!cityName) {
    throw new Error('City name is required');
  }

  const created = await ensureCity(userId, cityName);
  return created.id;
}
