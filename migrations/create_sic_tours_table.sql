-- Create SIC tours table for shared tour pricing

CREATE TABLE IF NOT EXISTS sic_tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  tour_name VARCHAR(255) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  pp_dbl_rate DECIMAL(10, 2) NOT NULL,
  single_supplement DECIMAL(10, 2) NULL,
  child_0to2 DECIMAL(10, 2) NULL,
  child_3to5 DECIMAL(10, 2) NULL,
  child_6to11 DECIMAL(10, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_city (user_id, city),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
