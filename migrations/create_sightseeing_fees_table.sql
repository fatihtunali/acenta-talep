-- Create sightseeing_fees table for storing entrance fees and sightseeing prices
-- Migration: create_sightseeing_fees_table
-- Date: 2025-10-08

CREATE TABLE IF NOT EXISTS sightseeing_fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  place_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_city (user_id, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
