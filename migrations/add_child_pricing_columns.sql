-- Add child pricing and single supplement columns to quote_expenses table
-- Migration: add_child_pricing_columns
-- Date: 2025-10-08

ALTER TABLE quote_expenses
ADD COLUMN single_supplement DECIMAL(10, 2) NULL AFTER price,
ADD COLUMN child_0to2 DECIMAL(10, 2) NULL AFTER single_supplement,
ADD COLUMN child_3to5 DECIMAL(10, 2) NULL AFTER child_0to2,
ADD COLUMN child_6to11 DECIMAL(10, 2) NULL AFTER child_3to5;
