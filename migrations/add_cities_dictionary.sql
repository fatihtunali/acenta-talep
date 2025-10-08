-- Create shared cities table and migrate existing hotel/restaurant/SIC tour cities
-- Migration: add_cities_dictionary
-- Date: 2025-10-08

-- 1. Create cities table if it doesn't exist
CREATE TABLE IF NOT EXISTS cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_city (user_id, normalized_name),
  INDEX idx_user_name (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Seed cities table from existing data (hotels, restaurants, sic_tours, transfers, sightseeing)
INSERT INTO cities (user_id, name, normalized_name, created_at)
SELECT seeded.user_id, seeded.name, seeded.normalized_name, seeded.first_seen
FROM (
  SELECT
    user_id,
    TRIM(city) AS name,
    LOWER(TRIM(city)) AS normalized_name,
    MIN(created_at) AS first_seen
  FROM hotels
  WHERE city IS NOT NULL AND TRIM(city) <> ''
  GROUP BY user_id, LOWER(TRIM(city))

  UNION

  SELECT
    user_id,
    TRIM(city) AS name,
    LOWER(TRIM(city)) AS normalized_name,
    MIN(created_at) AS first_seen
  FROM restaurants
  WHERE city IS NOT NULL AND TRIM(city) <> ''
  GROUP BY user_id, LOWER(TRIM(city))

  UNION

  SELECT
    user_id,
    TRIM(city) AS name,
    LOWER(TRIM(city)) AS normalized_name,
    MIN(created_at) AS first_seen
  FROM sic_tours
  WHERE city IS NOT NULL AND TRIM(city) <> ''
  GROUP BY user_id, LOWER(TRIM(city))

  UNION

  SELECT
    user_id,
    TRIM(city) AS name,
    LOWER(TRIM(city)) AS normalized_name,
    MIN(created_at) AS first_seen
  FROM transfers
  WHERE city IS NOT NULL AND TRIM(city) <> ''
  GROUP BY user_id, LOWER(TRIM(city))

  UNION

  SELECT
    user_id,
    TRIM(city) AS name,
    LOWER(TRIM(city)) AS normalized_name,
    MIN(created_at) AS first_seen
  FROM sightseeing_fees
  WHERE city IS NOT NULL AND TRIM(city) <> ''
  GROUP BY user_id, LOWER(TRIM(city))
) AS seeded
LEFT JOIN cities existing
  ON existing.user_id = seeded.user_id
  AND existing.normalized_name = seeded.normalized_name
WHERE existing.id IS NULL;

-- 3. Hotels: add city_id column, backfill, enforce FK, drop old city column/indexes
ALTER TABLE hotels ADD COLUMN city_id INT NULL AFTER user_id;

UPDATE hotels h
JOIN cities c
  ON c.user_id = h.user_id
  AND c.normalized_name = LOWER(TRIM(h.city))
SET h.city_id = c.id
WHERE h.city_id IS NULL;

UPDATE hotels
SET city_id = (
  SELECT id
  FROM cities
  WHERE cities.user_id = hotels.user_id
    AND cities.normalized_name = LOWER(TRIM(hotels.city))
  LIMIT 1
)
WHERE city_id IS NULL AND city IS NOT NULL AND TRIM(city) <> '';

ALTER TABLE hotels
  MODIFY city_id INT NOT NULL,
  ADD INDEX idx_city_id (city_id),
  ADD CONSTRAINT fk_hotels_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT;

ALTER TABLE hotels DROP INDEX idx_city;
ALTER TABLE hotels DROP INDEX idx_user_city;
ALTER TABLE hotels DROP INDEX unique_user_hotel;
ALTER TABLE hotels ADD UNIQUE KEY unique_user_hotel (user_id, city_id, hotel_name, category);
ALTER TABLE hotels DROP COLUMN city;

-- 4. Restaurants: add city_id column, backfill, enforce FK, drop old city column/indexes
ALTER TABLE restaurants ADD COLUMN city_id INT NULL AFTER user_id;

UPDATE restaurants r
JOIN cities c
  ON c.user_id = r.user_id
  AND c.normalized_name = LOWER(TRIM(r.city))
SET r.city_id = c.id
WHERE r.city_id IS NULL;

UPDATE restaurants
SET city_id = (
  SELECT id
  FROM cities
  WHERE cities.user_id = restaurants.user_id
    AND cities.normalized_name = LOWER(TRIM(restaurants.city))
  LIMIT 1
)
WHERE city_id IS NULL AND city IS NOT NULL AND TRIM(city) <> '';

ALTER TABLE restaurants
  MODIFY city_id INT NOT NULL,
  ADD INDEX idx_city_id (city_id),
  ADD CONSTRAINT fk_restaurants_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT;

ALTER TABLE restaurants DROP INDEX idx_city;
ALTER TABLE restaurants DROP INDEX idx_user_city;
ALTER TABLE restaurants DROP INDEX unique_user_restaurant;
ALTER TABLE restaurants ADD UNIQUE KEY unique_user_restaurant (user_id, city_id, restaurant_name);
ALTER TABLE restaurants DROP COLUMN city;

-- 5. SIC tours: add city_id column, backfill, enforce FK, drop old city column/indexes
ALTER TABLE sic_tours ADD COLUMN city_id INT NULL AFTER user_id;

UPDATE sic_tours st
JOIN cities c
  ON c.user_id = st.user_id
  AND c.normalized_name = LOWER(TRIM(st.city))
SET st.city_id = c.id
WHERE st.city_id IS NULL;

UPDATE sic_tours
SET city_id = (
  SELECT id
  FROM cities
  WHERE cities.user_id = sic_tours.user_id
    AND cities.normalized_name = LOWER(TRIM(sic_tours.city))
  LIMIT 1
)
WHERE city_id IS NULL AND city IS NOT NULL AND TRIM(city) <> '';

ALTER TABLE sic_tours
  MODIFY city_id INT NOT NULL,
  ADD INDEX idx_city_id (city_id),
  ADD CONSTRAINT fk_sic_tours_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT;

ALTER TABLE sic_tours DROP INDEX idx_city;
ALTER TABLE sic_tours DROP INDEX idx_user_city;
ALTER TABLE sic_tours DROP INDEX unique_user_tour;
ALTER TABLE sic_tours ADD UNIQUE KEY unique_user_tour (user_id, city_id, tour_name);
ALTER TABLE sic_tours DROP COLUMN city;

-- 6. Transfers: add city_id column, backfill, enforce FK, drop old city column/indexes
ALTER TABLE transfers ADD COLUMN city_id INT NULL AFTER user_id;

UPDATE transfers t
JOIN cities c
  ON c.user_id = t.user_id
  AND c.normalized_name = LOWER(TRIM(t.city))
SET t.city_id = c.id
WHERE t.city_id IS NULL;

UPDATE transfers
SET city_id = (
  SELECT id
  FROM cities
  WHERE cities.user_id = transfers.user_id
    AND cities.normalized_name = LOWER(TRIM(transfers.city))
  LIMIT 1
)
WHERE city_id IS NULL AND city IS NOT NULL AND TRIM(city) <> '';

ALTER TABLE transfers
  MODIFY city_id INT NOT NULL,
  ADD INDEX idx_city_id (city_id),
  ADD INDEX idx_user_city_id (user_id, city_id),
  ADD CONSTRAINT fk_transfers_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT;

ALTER TABLE transfers DROP INDEX idx_city;
ALTER TABLE transfers DROP INDEX idx_user_city;
ALTER TABLE transfers DROP COLUMN city;

-- 7. Sightseeing fees: add city_id column, backfill, enforce FK, drop old city column/indexes
ALTER TABLE sightseeing_fees ADD COLUMN city_id INT NULL AFTER user_id;

UPDATE sightseeing_fees sf
JOIN cities c
  ON c.user_id = sf.user_id
  AND c.normalized_name = LOWER(TRIM(sf.city))
SET sf.city_id = c.id
WHERE sf.city_id IS NULL;

UPDATE sightseeing_fees
SET city_id = (
  SELECT id
  FROM cities
  WHERE cities.user_id = sightseeing_fees.user_id
    AND cities.normalized_name = LOWER(TRIM(sightseeing_fees.city))
  LIMIT 1
)
WHERE city_id IS NULL AND city IS NOT NULL AND TRIM(city) <> '';

ALTER TABLE sightseeing_fees
  MODIFY city_id INT NOT NULL,
  ADD INDEX idx_city_id (city_id),
  ADD INDEX idx_user_city_id (user_id, city_id),
  ADD CONSTRAINT fk_sightseeing_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT;

ALTER TABLE sightseeing_fees DROP INDEX idx_city;
ALTER TABLE sightseeing_fees DROP INDEX idx_user_city;
ALTER TABLE sightseeing_fees DROP COLUMN city;
