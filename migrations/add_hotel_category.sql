-- Add hotel category field to quote_expenses
-- Migration: add_hotel_category
-- Date: 2025-10-09

-- Add hotel_category column to quote_expenses table
ALTER TABLE quote_expenses
ADD COLUMN hotel_category VARCHAR(50) NULL AFTER category;

-- Update existing hotel records to have a default category (optional)
-- UPDATE quote_expenses SET hotel_category = '3-star' WHERE category = 'hotelAccommodation' AND hotel_category IS NULL;
