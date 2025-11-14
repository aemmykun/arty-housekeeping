-- Init script for ARTY housekeeping canonical tables
-- Run this on your PostgreSQL instance (e.g., AWS RDS)

CREATE TABLE IF NOT EXISTS canonical_reservations (
  id SERIAL PRIMARY KEY,
  reservation_id VARCHAR(64),
  room_number VARCHAR(32),
  status VARCHAR(32),
  guest_name TEXT,
  raw_json JSONB,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
