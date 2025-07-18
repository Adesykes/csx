/*
  # Create business hours table for salon availability

  1. New Tables
    - `business_hours`
      - `id` (uuid, primary key)
      - `day_of_week` (integer, 0-6 for Sunday-Saturday)
      - `open_time` (time, opening time)
      - `close_time` (time, closing time)
      - `is_open` (boolean, whether open on this day)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `business_hours` table
    - Add policy for public read access
    - Add policy for authenticated users to manage hours
*/

CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Policy for public read access
CREATE POLICY "Anyone can read business hours"
  ON business_hours
  FOR SELECT
  TO public
  USING (true);

-- Policy for authenticated users to manage hours
CREATE POLICY "Authenticated users can manage business hours"
  ON business_hours
  FOR ALL
  TO authenticated
  USING (true);

-- Add unique constraint to prevent duplicate days
ALTER TABLE business_hours 
ADD CONSTRAINT unique_day_of_week 
UNIQUE (day_of_week);

-- Insert default business hours (Monday-Saturday 9AM-6PM, closed Sunday)
INSERT INTO business_hours (day_of_week, open_time, close_time, is_open) VALUES
  (0, '09:00:00', '18:00:00', false), -- Sunday - closed
  (1, '09:00:00', '18:00:00', true),  -- Monday
  (2, '09:00:00', '18:00:00', true),  -- Tuesday
  (3, '09:00:00', '18:00:00', true),  -- Wednesday
  (4, '09:00:00', '18:00:00', true),  -- Thursday
  (5, '09:00:00', '18:00:00', true),  -- Friday
  (6, '09:00:00', '17:00:00', true);  -- Saturday