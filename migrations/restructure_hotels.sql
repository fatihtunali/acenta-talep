-- Restructure hotels database to separate base info from pricing
-- This allows one hotel to have multiple pricing periods

-- Step 1: Rename existing hotels table
RENAME TABLE hotels TO hotels_old;

-- Step 2: Create new hotels table (base hotel information)
CREATE TABLE hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_city (user_id, city),
  INDEX idx_hotel_name (hotel_name),
  UNIQUE KEY unique_user_hotel (user_id, city, hotel_name, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 3: Create hotel_pricing table (pricing periods)
CREATE TABLE hotel_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  pp_dbl_rate DECIMAL(10, 2) NOT NULL,
  single_supplement DECIMAL(10, 2) NULL,
  child_0to2 DECIMAL(10, 2) NULL,
  child_3to5 DECIMAL(10, 2) NULL,
  child_6to11 DECIMAL(10, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  INDEX idx_dates (start_date, end_date),
  INDEX idx_hotel_id (hotel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 4: Migrate existing data
-- First, insert unique hotels (deduplicate based on city, hotel_name, category)
INSERT INTO hotels (user_id, city, hotel_name, category, created_at)
SELECT DISTINCT user_id, city, hotel_name, category, MIN(created_at)
FROM hotels_old
GROUP BY user_id, city, hotel_name, category;

-- Then, insert all pricing periods linked to the new hotel records
INSERT INTO hotel_pricing (hotel_id, start_date, end_date, pp_dbl_rate, single_supplement, child_0to2, child_3to5, child_6to11, created_at)
SELECT
  h.id,
  ho.start_date,
  ho.end_date,
  ho.pp_dbl_rate,
  ho.single_supplement,
  ho.child_0to2,
  ho.child_3to5,
  ho.child_6to11,
  ho.created_at
FROM hotels_old ho
JOIN hotels h ON h.user_id = ho.user_id
  AND h.city = ho.city
  AND h.hotel_name = ho.hotel_name
  AND h.category = ho.category;

-- Step 5: Drop old hotels table
DROP TABLE hotels_old;
