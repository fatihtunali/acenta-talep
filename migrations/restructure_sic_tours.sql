-- Restructure SIC tours database to separate base info from pricing
-- This allows one tour to have multiple pricing periods

-- Step 1: Rename existing sic_tours table
RENAME TABLE sic_tours TO sic_tours_old;

-- Step 2: Create new sic_tours table (base tour information)
CREATE TABLE sic_tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  tour_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_city (user_id, city),
  INDEX idx_tour_name (tour_name),
  UNIQUE KEY unique_user_tour (user_id, city, tour_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 3: Create sic_tour_pricing table (pricing periods)
CREATE TABLE sic_tour_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  pp_dbl_rate DECIMAL(10, 2) NOT NULL,
  single_supplement DECIMAL(10, 2) NULL,
  child_0to2 DECIMAL(10, 2) NULL,
  child_3to5 DECIMAL(10, 2) NULL,
  child_6to11 DECIMAL(10, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES sic_tours(id) ON DELETE CASCADE,
  INDEX idx_dates (start_date, end_date),
  INDEX idx_tour_id (tour_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 4: Migrate existing data
-- First, insert unique tours (deduplicate based on city, tour_name)
INSERT INTO sic_tours (user_id, city, tour_name, created_at)
SELECT DISTINCT user_id, city, tour_name, MIN(created_at)
FROM sic_tours_old
GROUP BY user_id, city, tour_name;

-- Then, insert all pricing periods linked to the new tour records
INSERT INTO sic_tour_pricing (tour_id, start_date, end_date, pp_dbl_rate, single_supplement, child_0to2, child_3to5, child_6to11, created_at)
SELECT
  st.id,
  sto.start_date,
  sto.end_date,
  sto.pp_dbl_rate,
  sto.single_supplement,
  sto.child_0to2,
  sto.child_3to5,
  sto.child_6to11,
  sto.created_at
FROM sic_tours_old sto
JOIN sic_tours st ON st.user_id = sto.user_id
  AND st.city = sto.city
  AND st.tour_name = sto.tour_name;

-- Step 5: Drop old sic_tours table
DROP TABLE sic_tours_old;
