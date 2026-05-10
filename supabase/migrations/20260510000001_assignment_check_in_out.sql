-- Add check-in/check-out time tracking to assignments
ALTER TABLE assignments
  ADD COLUMN check_in time,
  ADD COLUMN check_out time;

-- Comment for clarity
COMMENT ON COLUMN assignments.check_in IS 'Entry time; NULL means full shift assumed';
COMMENT ON COLUMN assignments.check_out IS 'Exit time; NULL means full shift assumed';
