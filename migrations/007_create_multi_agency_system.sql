-- Migration: Multi-Agency System
-- Date: 2025-10-15
-- Description: Add multi-agency support with white-label capabilities

-- 1. Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  company_name_normalized VARCHAR(255) NOT NULL,

  -- Contact Information
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),

  -- Address
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Turkey',

  -- Branding (White-label)
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#1e40af',
  secondary_color VARCHAR(7) DEFAULT '#3b82f6',

  -- Pricing Settings
  default_markup_percentage DECIMAL(5,2) DEFAULT 15.00,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Status
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  subscription_type ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'basic',
  subscription_expires_at DATETIME,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  UNIQUE KEY unique_company_name (company_name_normalized),
  INDEX idx_status (status),
  INDEX idx_subscription (subscription_type, subscription_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Update users table to link with agencies
ALTER TABLE users
ADD COLUMN agency_id INT DEFAULT NULL AFTER id,
ADD COLUMN user_role ENUM('admin', 'agency_owner', 'agency_user', 'operator') DEFAULT 'agency_user' AFTER role,
ADD CONSTRAINT fk_users_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
ADD INDEX idx_agency_id (agency_id);

-- 3. Update quotes table for multi-agency and status tracking
ALTER TABLE quotes
ADD COLUMN agency_id INT DEFAULT NULL AFTER user_id,
ADD COLUMN quote_status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'confirmed') DEFAULT 'draft' AFTER quote_name,
ADD COLUMN client_name VARCHAR(255) DEFAULT NULL AFTER quote_status,
ADD COLUMN client_email VARCHAR(255) DEFAULT NULL AFTER client_name,
ADD COLUMN client_phone VARCHAR(50) DEFAULT NULL AFTER client_email,
ADD COLUMN markup_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER tax,
ADD COLUMN final_price DECIMAL(10,2) DEFAULT 0.00 AFTER markup_percentage,
ADD COLUMN sent_at DATETIME DEFAULT NULL AFTER final_price,
ADD COLUMN responded_at DATETIME DEFAULT NULL AFTER sent_at,
ADD COLUMN confirmed_at DATETIME DEFAULT NULL AFTER responded_at,
ADD COLUMN notes TEXT DEFAULT NULL AFTER confirmed_at,
ADD CONSTRAINT fk_quotes_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
ADD INDEX idx_agency_id (agency_id),
ADD INDEX idx_quote_status (quote_status),
ADD INDEX idx_sent_at (sent_at);

-- 4. Create quote_markup_history table (track markup changes)
CREATE TABLE IF NOT EXISTS quote_markup_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quote_id INT NOT NULL,
  user_id INT NOT NULL,
  old_markup DECIMAL(5,2),
  new_markup DECIMAL(5,2),
  old_final_price DECIMAL(10,2),
  new_final_price DECIMAL(10,2),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_markup_history_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  CONSTRAINT fk_markup_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_quote_id (quote_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create agency_branding_assets table (for multiple logos, documents)
CREATE TABLE IF NOT EXISTS agency_branding_assets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agency_id INT NOT NULL,
  asset_type ENUM('logo', 'header', 'footer', 'letterhead', 'signature') NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_branding_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
  INDEX idx_agency_type (agency_id, asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Insert default admin agency (for system admin)
INSERT INTO agencies (
  company_name,
  company_name_normalized,
  email,
  status,
  subscription_type,
  default_markup_percentage
) VALUES (
  'System Admin',
  'system admin',
  'admin@system.local',
  'active',
  'enterprise',
  0.00
);

-- 7. Update existing users to belong to system admin agency
UPDATE users
SET agency_id = (SELECT id FROM agencies WHERE company_name_normalized = 'system admin' LIMIT 1),
    user_role = 'admin'
WHERE role = 'admin';

-- 8. Update existing quotes to belong to users' agencies
UPDATE quotes q
INNER JOIN users u ON q.user_id = u.id
SET q.agency_id = u.agency_id;
