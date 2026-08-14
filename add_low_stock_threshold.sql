-- Migration: Add low_stock_threshold column to products table
-- Run this inside your Supabase project's SQL Editor

-- 1. Add column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0);
