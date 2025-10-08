-- Add date range fields to hotels table for seasonal pricing
-- Migration: add_hotel_dates
-- Date: 2025-10-08

ALTER TABLE hotels
ADD COLUMN start_date DATE NULL AFTER category,
ADD COLUMN end_date DATE NULL AFTER start_date,
ADD INDEX idx_dates (start_date, end_date);
