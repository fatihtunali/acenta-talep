-- Create hotels table for storing hotel information
-- Migration: create_hotels_table
-- Date: 2025-10-08

CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  pp_dbl_rate DECIMAL(10, 2) NOT NULL,
  single_supplement DECIMAL(10, 2) NULL,
  child_0to2 DECIMAL(10, 2) NULL,
  child_3to5 DECIMAL(10, 2) NULL,
  child_6to11 DECIMAL(10, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_city (user_id, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
