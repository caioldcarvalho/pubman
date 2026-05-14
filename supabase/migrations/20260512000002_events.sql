CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id uuid NOT NULL REFERENCES schedule_dates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  expected_attendees int,
  reserved_tables text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date ON events(date_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
