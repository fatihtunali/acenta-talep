-- Restructure meals database to separate restaurants from menu pricing
-- This allows one restaurant to have multiple menu options with optional seasonal pricing

-- Step 1: Rename existing meals table
RENAME TABLE meals TO meals_old;

-- Step 2: Create new restaurants table (base restaurant information)
CREATE TABLE restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  restaurant_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_city (user_id, city),
  INDEX idx_restaurant_name (restaurant_name),
  UNIQUE KEY unique_user_restaurant (user_id, city, restaurant_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 3: Create restaurant_menu_pricing table (menu items with optional seasonal pricing)
CREATE TABLE restaurant_menu_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  menu_option VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  INDEX idx_menu_option (menu_option),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_restaurant_id (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 4: Migrate existing data
-- First, insert unique restaurants (deduplicate based on city, restaurant_name)
INSERT INTO restaurants (user_id, city, restaurant_name, created_at)
SELECT DISTINCT user_id, city, restaurant_name, MIN(created_at)
FROM meals_old
GROUP BY user_id, city, restaurant_name;

-- Then, insert all menu items linked to the new restaurant records
INSERT INTO restaurant_menu_pricing (restaurant_id, menu_option, price, created_at)
SELECT
  r.id,
  mo.menu_option,
  mo.price,
  mo.created_at
FROM meals_old mo
JOIN restaurants r ON r.user_id = mo.user_id
  AND r.city = mo.city
  AND r.restaurant_name = mo.restaurant_name;

-- Step 5: Drop old meals table
DROP TABLE meals_old;
