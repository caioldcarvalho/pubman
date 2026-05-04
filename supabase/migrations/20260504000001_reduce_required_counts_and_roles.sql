-- Reduce default required_count (Fri: 3→1, Sat: 5→3)
ALTER TABLE schedule_dates ALTER COLUMN required_count SET DEFAULT 1;

-- Add bar and cozinha roles
ALTER TABLE collaborators DROP CONSTRAINT collaborators_role_check;
ALTER TABLE collaborators ADD CONSTRAINT collaborators_role_check
  CHECK (role IN ('instrutor', 'garcom', 'ambos', 'bar', 'cozinha'));
