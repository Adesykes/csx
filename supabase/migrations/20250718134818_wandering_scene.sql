/*
  # Create services table for nail salon services

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `name` (text, service name)
      - `description` (text, service description)
      - `price` (decimal, service price)
      - `duration` (integer, duration in minutes)
      - `category` (text, service category)
      - `active` (boolean, whether service is active)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `services` table
    - Add policy for public read access to active services
    - Add policy for authenticated users to manage services
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration integer NOT NULL,
  category text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to active services
CREATE POLICY "Anyone can read active services"
  ON services
  FOR SELECT
  TO public
  USING (active = true);

-- Policy for authenticated users to manage services
CREATE POLICY "Authenticated users can manage services"
  ON services
  FOR ALL
  TO authenticated
  USING (true);

-- Insert sample services
INSERT INTO services (name, description, price, duration, category, active) VALUES
  ('Classic Manicure', 'Basic nail care with polish application', 25.00, 45, 'Manicure', true),
  ('Gel Manicure', 'Long-lasting gel polish manicure', 35.00, 60, 'Manicure', true),
  ('Classic Pedicure', 'Relaxing foot care with polish', 30.00, 60, 'Pedicure', true),
  ('Gel Pedicure', 'Long-lasting gel polish pedicure', 40.00, 75, 'Pedicure', true),
  ('Nail Art (Simple)', 'Basic nail art design per nail', 5.00, 15, 'Nail Art', true),
  ('Nail Art (Complex)', 'Detailed nail art design per nail', 10.00, 30, 'Nail Art', true),
  ('French Manicure', 'Classic French tip manicure', 30.00, 50, 'Manicure', true),
  ('Spa Pedicure', 'Luxurious spa treatment for feet', 50.00, 90, 'Pedicure', true);