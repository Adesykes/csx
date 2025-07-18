/*
  # Create appointments table for booking system

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `customer_name` (text, customer name)
      - `customer_email` (text, customer email)
      - `customer_phone` (text, customer phone)
      - `service_id` (uuid, foreign key to services)
      - `service_name` (text, service name for record keeping)
      - `service_price` (decimal, service price at time of booking)
      - `appointment_date` (date, appointment date)
      - `start_time` (time, start time)
      - `end_time` (time, end time)
      - `status` (text, appointment status)
      - `payment_status` (text, payment status)
      - `payment_intent_id` (text, Stripe payment intent ID)
      - `notes` (text, additional notes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `appointments` table
    - Add policy for public insert (booking)
    - Add policy for authenticated users to manage all appointments
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  service_id uuid,
  service_name text NOT NULL,
  service_price decimal(10,2) NOT NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_intent_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy for public insert (booking appointments)
CREATE POLICY "Anyone can create appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy for authenticated users to manage all appointments
CREATE POLICY "Authenticated users can manage appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (true);

-- Add foreign key constraint to services table
ALTER TABLE appointments 
ADD CONSTRAINT fk_appointments_service 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;